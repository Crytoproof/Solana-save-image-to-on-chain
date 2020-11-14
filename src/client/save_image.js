
import {
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'

import * as BufferLayout from 'buffer-layout';

import {sendAndConfirmTransaction} from './util/send-and-confirm-transaction';

import {getOurAccount} from './ourAccount'
import {getNodeConnection} from './nodeConnection'
import {getStore} from './storeConfig'
import * as fs from "fs";

// import {fs} from 'fs'
// var fs = require('fs');

async function base64_encode(file) {
    // read binary data
    var bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString('base64');
}

async function main() {

  const ourAccount = await getOurAccount()

  const connection = await getNodeConnection()

  const s = await getStore(connection, 'simplest.json')

  if ( !s.inStore ) {
    console.log("Deploy program first")
    process.exit(1)
  }

  let candidate = process.argv[2];
  let imagebase64 =await base64_encode(candidate)

  // if ( ! candidate || candidate !== "1" && candidate !== "2" ) {
  //   console.log("No candidate supplied (should be 1 or 2)");
  //   process.exit(1);
  // }

  // candidate = parseInt(candidate,10)

  console.log("-----",imagebase64)
  

  let imagearry = imagebase64.match(/.{1,50}/g);
  console.log(imagearry)
  let instruction_data = Buffer.from(imagearry[0])

  // return;
  console.log("save image:", candidate, "ProgramId:", s.programId.toString(), "AccountId:", s.accountId.toString())
  var i;

  const balBeforeVote = await connection.getBalance( ourAccount.publicKey )
  for (i = 0; i < imagearry.length; i++) {
    instruction_data = Buffer.from(imagearry[i])
    const instruction = new TransactionInstruction({
    keys: [{pubkey: s.accountId, isSigner: false, isWritable: true}],
    programId: s.programId,
    data: instruction_data,
  })
    await sendAndConfirmTransaction(
      'vote',
      connection,
      new Transaction().add(instruction),
      ourAccount,
    )
    console.log("send success ",candidate," part ", i+1 , " of ", imagearry.length)
    await new Promise(resolve => setTimeout(resolve, 1000));//wait for avoid ddos block chain
  }
  const instruction = new TransactionInstruction({
    keys: [{pubkey: s.accountId, isSigner: false, isWritable: true}],
    programId: s.programId,
    data: instruction_data,
  })
  await sendAndConfirmTransaction(
    'vote',
    connection,
    new Transaction().add(instruction),
    ourAccount,
  )

  const balAfterVote = await connection.getBalance( ourAccount.publicKey )

  const costOfVote = balBeforeVote - balAfterVote

  console.log("Cost of save image to blockchain:",costOfVote,"lamports (", costOfVote/LAMPORTS_PER_SOL, ")", "x",imagearry.length," part of this image")

  const accountInfo = await connection.getAccountInfo(s.accountId)
  const data = Buffer.from(accountInfo.data)
  
  const accountDataLayout = BufferLayout.struct([
    BufferLayout.u32('count1'),
    BufferLayout.u32('count2'),
  ]);

  const counts = accountDataLayout.decode(Buffer.from(accountInfo.data))

  console.log("saved all Transactionid to recover image ") 

  console.log("-----")
}

main()
  .catch(err => {
    console.error(err)
  })
  .then(() => process.exit())
