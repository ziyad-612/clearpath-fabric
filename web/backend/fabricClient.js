// fabricClient.js
'use strict';

const grpc = require('@grpc/grpc-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { connect, signers } = require('@hyperledger/fabric-gateway');

const channelName = 'mychannel';
const chaincodeName = 'clearpath';

// مسارات شهادات Org1 Admin (من test-network)
const cryptoPath = path.resolve(__dirname, '../../test-network/organizations/peerOrganizations/org1.example.com');

// ملاحظة: اسم ملف الشهادة قد يختلف حسب الإصدار
function findCertPath() {
  const signcertsDir = path.join(
    cryptoPath,
    'users/Admin@org1.example.com/msp/signcerts'
  );
  const files = fs.readdirSync(signcertsDir);
  const certFile = files.find(f => f.endsWith('.pem'));
  if (!certFile) throw new Error('Certificate not found in signcerts');
  return path.join(signcertsDir, certFile);
}

// ملاحظة: اسم ملف المفتاح يتغير (زي اللي عندك *_sk)
function findPrivateKeyPath() {
  const keystoreDir = path.join(
    cryptoPath,
    'users/Admin@org1.example.com/msp/keystore'
  );
  const files = fs.readdirSync(keystoreDir);
  const keyFile = files.find(f => f.endsWith('_sk') || f.endsWith('.pem'));
  if (!keyFile) throw new Error('Private key not found in keystore');
  return path.join(keystoreDir, keyFile);
}


const tlsCertPath = path.join(
  cryptoPath,
  'peers/peer0.org1.example.com/tls/ca.crt'
);

const peerEndpoint = 'localhost:7051';
const peerHostAlias = 'peer0.org1.example.com';

function newGrpcConnection() {
  const tlsRootCert = fs.readFileSync(tlsCertPath);
  const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);

  return new grpc.Client(peerEndpoint, tlsCredentials, {
    'grpc.ssl_target_name_override': peerHostAlias,
    'grpc.default_authority': peerHostAlias,
  });
}

function newIdentity() {
  const certPath = findCertPath();
  const credentials = fs.readFileSync(certPath);
  return { mspId: 'Org1MSP', credentials };
}

function newSigner() {
  const keyPath = findPrivateKeyPath();
  const privateKeyPem = fs.readFileSync(keyPath);
  const privateKey = crypto.createPrivateKey(privateKeyPem);

  // ✅ هذا الاسم الصحيح مع fabric-gateway 1.x
  return signers.newPrivateKeySigner(privateKey);
}

async function getContract() {
  const client = newGrpcConnection();

  const gateway = connect({
    client,
    identity: newIdentity(),
    signer: newSigner(),
  });

  const network = gateway.getNetwork(channelName);
  const contract = network.getContract(chaincodeName);

  return { contract, gateway, client };
}

module.exports = { getContract };