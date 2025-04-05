const chalk = require('chalk');
const axios = require('axios');
const cron = require('node-cron');
const { Account, Ed25519PrivateKey, Hex } = require('@aptos-labs/ts-sdk');
const { displayskw } = require('./skw/displayskw');

const {
  client,
  delay,
  getPrivateKeysFromFile,
  parseAmount,
  randomjumlah,
  spinner,
} = require('./skw/utils');


const CONTRACT_ADDRESS =
  '0xf7429cda18fc0dd78d0dc48b102158024f1dc3a511a2a65ea553b5970d65b028';

const jumlah = randomjumlah().toString();
const amount = parseAmount(jumlah);

async function getbalance(account) {
  const address = account.accountAddress.toString();
  const endpoint = "https://indexer.testnet.movementnetwork.xyz/v1/graphql";

  const query = `
    query CoinsData($owner_address: String, $limit: Int, $offset: Int) {
      current_fungible_asset_balances(
        where: {owner_address: {_eq: $owner_address}}
        limit: $limit
        offset: $offset
      ) {
        amount
        asset_type
        metadata {
          name
          decimals
          symbol
          token_standard
        }
      }
    }
  `;

  const variables = {
    owner_address: address,
    limit: 100,
    offset: 0
  };

  try {
    const response = await axios.post(endpoint, {
      query,
      variables
    });

    const balances = response.data.data.current_fungible_asset_balances;

    const hstMove = balances.find(
      (b) => b.metadata.symbol === 'hstMOVE'
    );

    if (!hstMove) {
      console.log(" Tidak menemukan token hstMOVE");
      return 0n;
    }

    const hstBalance = BigInt(hstMove.amount);
    return hstBalance;
  } catch (error) {
    console.error("❌ Gagal mengambil saldo dari GraphQL:", error.message);
    return 0n;
  }
}

async function claimfaucet(account) {
  while (true) {
    try {
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

      spinner.succeed(chalk.hex('#3CB371')(` Claim 100 hstMOVE berhasil!`));
      await delay(1000);

    } catch (error) {
      spinner.stop();
      if ((error.message || '').includes('EMINT_LIMIT_REACHED')) {
        console.log(chalk.red('⛔ Mint limit reached'));
      } else {
        console.log(chalk.red('❌ Gagal claim faucet:', error.message));
      }
      break;
    }
  }
}

async function stake(account) {
  try {
    const hstBalance = await getbalance(account);
    spinner.start(chalk.hex('#FF8C00')(` Proses stake ${hstBalance} hstMOVE sedang diproses...`));
    const txn = await client.transaction.build.simple({
      sender: account.accountAddress.toString(),
      data: {
        function: `${CONTRACT_ADDRESS}::eigenfi_move_vault_hstmove::stake`,
        typeArguments: [],
        functionArguments: [hstBalance.toString()],
      },
    });

    const result = await client.transaction.signAndSubmitTransaction({
      signer: account,
      transaction: txn,
    });

    await client.waitForTransaction({ transactionHash: result.hash });

    spinner.succeed(chalk.hex('#3CB371')(` Stake ${jumlah} hstMOVE berhasil!`));
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
    spinner.succeed(chalk.hex('#3CB371')(` Unstake ${jumlah} hstMOVE berhasil!`));
  } catch (error) {
    spinner.fail(" Gagal unstake:", error);
  }
}

async function compound(account) {
  try {
    spinner.start(chalk.hex('#FF8C00')(` Proses Stake Reward sedang diproses...`));
    const txn = await client.transaction.build.simple({
      sender: account.accountAddress.toString(),
      data: {
        function: `${CONTRACT_ADDRESS}::eigenfi_move_vault_hstmove::compound`,
        typeArguments: [],
        functionArguments: [],
      },
    });

    const result = await client.transaction.signAndSubmitTransaction({
      signer: account,
      transaction: txn,
    });

    await client.waitForTransaction({ transactionHash: result.hash });

    spinner.succeed(chalk.hex('#3CB371')(` Stake Reward berhasil!`));
  } catch (error) {
    spinner.fail(" Gagal stake:", error);
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

      console.log(chalk.hex('#00CED1')("🔐 Account :", account.accountAddress.toString()));

      await claimfaucet(account);
      await stake(account);
      await unstake(account);
      await compound(account);

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

startBot();
