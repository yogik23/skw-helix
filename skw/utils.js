const fs = require('fs');
const ora = require('ora');
const {
  Aptos,
  AptosConfig,
  Network,
} = require('@aptos-labs/ts-sdk');

const config = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: "https://aptos.testnet.bardock.movementlabs.xyz/v1",
});

const spinner = ora({
  color: "cyan",
});

const client = new Aptos(config);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getPrivateKeysFromFile(filePath = 'private_keys.txt') {
  const privateKeys = fs.readFileSync(filePath, 'utf-8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return privateKeys;
}

function parseAmount(amountStr, decimals = 8) {
  const [whole, fraction = ""] = amountStr.split(".");
  const fractionPadded = (fraction + "0".repeat(decimals)).slice(0, decimals);
  return `${whole}${fractionPadded}`.replace(/^0+/, "") || "0";
}

function randomjumlah(min = 20, max = 100) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
  config,
  getPrivateKeysFromFile,
  parseAmount,
  randomjumlah,
  delay,
  client,
  spinner,
};
