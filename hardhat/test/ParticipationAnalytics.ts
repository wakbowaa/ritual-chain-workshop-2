import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther } from "viem";

const ADDRESSES = {
  scheduler: "0x56e776BAE2DD60664b69Bd5F865F1180ffB7D58B",
  wallet: "0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948",
  registry: "0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F",
  http: "0x0000000000000000000000000000000000000801",
  jq: "0x0000000000000000000000000000000000000803",
} as const;

describe("RitualPredict — Participation Analytics", async function () {
  const { viem, networkHelpers } = await network.create();
  const publicClient = await viem.getPublicClient();
  const testClient = await viem.getTestClient();
  const [creator, yesBettor, noBettor] = await viem.getWalletClients();
  // Contract names are dynamic at this boundary; generated ABIs still type every call.
  async function installMock(name: string, address: `0x${string}`) {
    const mock = await viem.deployContract(name);
    const code = await publicClient.getCode({ address: mock.address });
    assert.ok(code);
    await testClient.setCode({ address, bytecode: code });
  }

  async function setup() {
    await installMock("MockScheduler", ADDRESSES.scheduler);
    await installMock("MockRegistry", ADDRESSES.registry);
    await installMock("MockHttpPrecompile", ADDRESSES.http);
    await installMock("MockJqPrecompile", ADDRESSES.jq);
    await installMock("MockRitualWallet", ADDRESSES.wallet);
    const scheduler: any = await viem.getContractAt("MockScheduler", ADDRESSES.scheduler);
    const registry: any = await viem.getContractAt("MockRegistry", ADDRESSES.registry);
    const http: any = await viem.getContractAt("MockHttpPrecompile", ADDRESSES.http);
    const jq: any = await viem.getContractAt("MockJqPrecompile", ADDRESSES.jq);
    await registry.write.configure(["0x000000000000000000000000000000000000bEEF", true]);
    await http.write.configure([200, "0x7b227072696365223a343230307d", ""]);
    await jq.write.configure([4200n, true]);
    const predict: any = await viem.deployContract("RitualPredict", [200n]);
    return { predict, scheduler, http };
  }

  async function createMarket(predict: any) {
    await predict.write.createMarket([{
      question: "Will ETH be at least $4,000?",
      oracleUrl: "https://oracle.example/eth",
      jsonPath: ".price",
      target: 4000n,
      comparator: 1,
      bettingSeconds: 30n,
      resolveDelaySeconds: 15n,
    }]);
    return predict.read.getMarket([1n]);
  }

  it("creates a market and books three autonomous resolution attempts", async () => {
    const { predict } = await networkHelpers.loadFixture(setup);
    const market = await createMarket(predict);
    assert.equal(market.id, 1n);
    assert.equal(market.scheduleId, 1n);
    assert.equal(market.state, 0);
    assert.ok(market.resolveBlock > market.closeBlock);
  });

  it("resolves YES and pays the proportional pool to the winner", async () => {
    const { predict, scheduler } = await networkHelpers.loadFixture(setup);
    const market = await createMarket(predict);
    await predict.write.bet([1n, true], { account: yesBettor.account, value: parseEther("1") });
    await predict.write.bet([1n, false], { account: noBettor.account, value: parseEther("2") });
    const currentBlock = await publicClient.getBlockNumber();
    await testClient.mine({ blocks: Number(market.resolveBlock - currentBlock) });
    await scheduler.write.trigger([1n, 0n]);

    const resolved = await predict.read.getMarket([1n]);
    assert.equal(resolved.state, 3);
    assert.equal(resolved.outcome, 1);
    assert.equal(resolved.observedValue, 4200n);
    const stakes = await predict.read.stakesOf([1n, yesBettor.account.address]);
    assert.equal(stakes[3], parseEther("3"));
  });

  it("invalidates after three oracle failures and enables refunds", async () => {
    const { predict, scheduler, http } = await networkHelpers.loadFixture(setup);
    const market = await createMarket(predict);
    await predict.write.bet([1n, true], { account: yesBettor.account, value: parseEther("1") });
    await http.write.configure([503, "0x", "upstream unavailable"]);
    const currentBlock = await publicClient.getBlockNumber();
    await testClient.mine({ blocks: Number(market.resolveBlock - currentBlock) });
    await scheduler.write.trigger([1n, 0n]);
    await scheduler.write.trigger([1n, 1n]);
    await scheduler.write.trigger([1n, 2n]);

    const invalid = await predict.read.getMarket([1n]);
    assert.equal(invalid.state, 4);
    assert.equal(invalid.attempts, 3);
    const stakes = await predict.read.stakesOf([1n, yesBettor.account.address]);
    assert.equal(stakes[3], parseEther("1"));
  });

  it("counts distinct participants separately from total bets", async () => {
    const { predict } = await networkHelpers.loadFixture(setup);
    await createMarket(predict);
    await predict.write.bet([1n, true], {
      account: yesBettor.account,
      value: parseEther("1"),
    });
    await predict.write.bet([1n, false], {
      account: noBettor.account,
      value: parseEther("0.5"),
    });

    assert.equal(await predict.read.uniqueBettors([1n]), 2n);
    assert.equal(await predict.read.betCount([1n]), 2n);
  });

  it("does not count a repeat bettor as a new participant", async () => {
    const { predict } = await networkHelpers.loadFixture(setup);
    await createMarket(predict);
    await predict.write.bet([1n, true], {
      account: yesBettor.account,
      value: parseEther("0.25"),
    });
    await predict.write.bet([1n, false], {
      account: yesBettor.account,
      value: parseEther("0.75"),
    });

    assert.equal(await predict.read.uniqueBettors([1n]), 1n);
    assert.equal(await predict.read.betCount([1n]), 2n);
    assert.equal(
      await predict.read.walletBetCount([1n, yesBettor.account.address]),
      2n,
    );
  });
});

