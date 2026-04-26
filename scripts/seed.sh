#!/usr/bin/env bash
set -e

cd "$HOME/fabric-samples/test-network"

# لازم تكون عندك هذي المتغيرات (زي اللي سويتها قبل)
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

ORDERER_CA=${PWD}/organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem
PEER0_ORG1_CA=${PWD}/organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem
PEER0_ORG2_CA=${PWD}/organizations/peerOrganizations/org2.example.com/tlsca/tlsca.org2.example.com-cert.pem

invoke() {
  peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls \
    --cafile "$ORDERER_CA" \
    -C mychannel -n clearpath \
    --peerAddresses localhost:7051 --tlsRootCertFiles "$PEER0_ORG1_CA" \
    --peerAddresses localhost:9051 --tlsRootCertFiles "$PEER0_ORG2_CA" \
    --waitForEvent --waitForEventTimeout 60s \
    -c "$1"
}

query() {
  peer chaincode query -C mychannel -n clearpath -c "$1"
}

echo "== Seed: Register Saudi products =="

# منتجات سعودية (مفتاح الدفعة لازم يكون unique)
invoke '{"function":"RegisterProduct","Args":["BATCH-MILK-001","Milk 1L","Almarai","2026-02-18"]}'
invoke '{"function":"RegisterProduct","Args":["BATCH-WATER-001","Water 500ml","Nova","2026-02-18"]}'
invoke '{"function":"RegisterProduct","Args":["BATCH-JUICE-001","Orange Juice 1L","Almarai","2026-02-18"]}'
invoke '{"function":"RegisterProduct","Args":["BATCH-DATES-001","Dates 1kg","AlQassimFarms","2026-02-18"]}'
invoke '{"function":"RegisterProduct","Args":["BATCH-YOGURT-001","Yogurt 170g","Nadec","2026-02-18"]}'

echo "== Seed: Record transactions (Warehouse -> Retail) =="

# مسارات داخل الرياض (أمثلة)
invoke '{"function":"RecordTransaction","Args":["BATCH-MILK-001","RiyadhWarehouse","Riyadh, KSA","4C"]}'
invoke '{"function":"RecordTransaction","Args":["BATCH-MILK-001","Panda_Riyadh_01","Riyadh - Panda 01","6C"]}'
invoke '{"function":"RecordTransaction","Args":["BATCH-MILK-001","Danube_Riyadh_02","Riyadh - Danube 02","5C"]}'

invoke '{"function":"RecordTransaction","Args":["BATCH-WATER-001","RiyadhWarehouse","Riyadh, KSA","18C"]}'
invoke '{"function":"RecordTransaction","Args":["BATCH-WATER-001","Tamimi_Riyadh_03","Riyadh - Tamimi 03","20C"]}'

invoke '{"function":"RecordTransaction","Args":["BATCH-JUICE-001","RiyadhWarehouse","Riyadh, KSA","5C"]}'
invoke '{"function":"RecordTransaction","Args":["BATCH-JUICE-001","Carrefour_Riyadh_01","Riyadh - Carrefour 01","7C"]}'

invoke '{"function":"RecordTransaction","Args":["BATCH-DATES-001","RiyadhWarehouse","Riyadh, KSA","22C"]}'
invoke '{"function":"RecordTransaction","Args":["BATCH-DATES-001","Othaim_Riyadh_02","Riyadh - Othaim 02","24C"]}'

invoke '{"function":"RecordTransaction","Args":["BATCH-YOGURT-001","RiyadhWarehouse","Riyadh, KSA","4C"]}'
invoke '{"function":"RecordTransaction","Args":["BATCH-YOGURT-001","Panda_Riyadh_01","Riyadh - Panda 01","6C"]}'

echo "== Seed: Trace & Verify =="

for id in BATCH-MILK-001 BATCH-WATER-001 BATCH-JUICE-001 BATCH-DATES-001 BATCH-YOGURT-001; do
  echo ""
  echo "--- TRACE $id ---"
  query "{\"function\":\"TraceProduct\",\"Args\":[\"$id\"]}"
  echo "--- VERIFY $id ---"
  query "{\"function\":\"VerifyProduct\",\"Args\":[\"$id\"]}"
done

echo ""
echo "✅ Done. Seed data loaded."
