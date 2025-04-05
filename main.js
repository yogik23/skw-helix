require('dotenv').config();
const chalk = require('chalk');
const cron = require('node-cron');
const { Account, Ed25519PrivateKey, Hex } = require('@aptos-labs/ts-sdk');
const { displayskw } = require('./skw/displayskw');

const {
  client,
  delay,
  getPrivateKeysFromFile,
  parseAmount,
  spinner,
} = require('./skw/utils');


const CONTRACT_ADDRESS =
  '0xf7429cda18fc0dd78d0dc48b102158024f1dc3a511a2a65ea553b5970d65b028';

const jumlah = "100"; // Ubah bebas
const amount = parseAmount(jumlah);

async function stake(account) {
  try {
    spinner.start(chalk.hex('#FF8C00')(` Proses unstake ${jumlah} hstMOVE sedang diproses...`));
    const txn = await client.transaction.build.simple({
      sender: account.accountAddress.toString(),
      data: {
        function: `${CONTRACT_ADDRESS}::eigenfi_move_vault_hstmove::stake`,
        typeArguments: [],
        functionArguments: [amount],
      },
    });

    const result = await client.transaction.signAndSubmitTransaction({
      signer: account,
      transaction: txn,
    });

    await client.waitForTransaction({ transactionHash: result.hash });

    spinner.succeed(chalk.hex('#3CB371')(` Stake berhasil!`));
  } catch (error) {
    spinner.fail(" Gagal stake:", error);
  }
}

async function unstake(account) {
  try {
    spinner.start(chalk.hex('#FF8C00')(` Proses unstake ${jumlah} hstMOVE sedang diproses...`));
    const txn = await client.transaction.build.simple({
      sender: account.accountAddress.toString(),
      data: {
        function: `${CONTRACT_ADDRESS}::eigenfi_move_vault_hstmove::unstake`,
        typeArguments: [],
        functionArguments: [amount],
      },
    });

    const result = await client.transaction.signAndSubmitTransaction({
      signer: account,
      transaction: txn,
    });

    await client.waitForTransaction({ transactionHash: result.hash });
    spinner.succeed(chalk.hex('#3CB371')(` Unstake berhasil!`));
  } catch (error) {
    spinner.fail(" Gagal unstake:", error);
  }
}

async function claimfaucet(account) {
  try {
    for (let i = 1; i <= 2; i++) {
      spinner.start(chalk.hex('#FF8C00')(` Claim Faucet 100 hstMOVE sedang diproses...`));

      const txn = await client.transaction.build.simple({
        sender: account.accountAddress.toString(),
        data: {
          function: `${CONTRACT_ADDRESS}::eigenfi_token_minter::mint_fa`,
          typeArguments: [],
          functionArguments: [
            "0x9c9b084429eecf70c7c4f9b18980eb3cbb9c9a70fee7abfb59ca637005c5b430",
            "10000000000"
          ],
        },
      });

      const result = await client.transaction.signAndSubmitTransaction({
        signer: account,
        transaction: txn,
      });

      await client.waitForTransaction({ transactionHash: result.hash });

      spinner.succeed(chalk.hex('#3CB371')(` Claim berhasil!`));

      if (i < 2) {
        await delay(1000);
      }
    }

  } catch (error) {
    spinner.fail(` Gagal claim: ${error.message}`);
  }
}

async function startBot() {
  console.clear();
  displayskw();
  console.log();

  const privateKeys = getPrivateKeysFromFile();

  for (const senderPrivateKey of privateKeys) {
    if (!senderPrivateKey || typeof senderPrivateKey !== 'string') {
      console.error("❌ Private key tidak valid:", senderPrivateKey);
      continue;
    }

    let PrivateKey = senderPrivateKey.startsWith('0x')
      ? senderPrivateKey
      : '0x' + senderPrivateKey;

    try {
      const privateKeyBytes = Hex.fromHexString(PrivateKey).toUint8Array();
      const privateKey = new Ed25519PrivateKey(privateKeyBytes);
      const account = Account.fromPrivateKey({ privateKey });

      console.log(chalk.hex('#BA55D3')("🔐 Account :", account.accountAddress.toString()));

      await claimfaucet(account);
      await stake(account);
      await unstake(account);

      console.log();
      await delay(3000);

    } catch (err) {
      console.error("❌ Error saat memproses akun:", err);
    }
  }
}

async function main() {
    cron.schedule('0 1 * * *', async () => { 
        await startBot();
        console.log();
        console.log(chalk.hex('#FF00FF')(`Cron AKTIF`));
        console.log(chalk.hex('#FF1493')('Jam 08:00 WIB Autobot Akan Run'));
    });

    await startBot();
    console.log();
    console.log(chalk.hex('#FF00FF')(`Cron AKTIF`));
    console.log(chalk.hex('#FF1493')('Jam 08:00 WIB Autobot Akan Run'));
}

main();
