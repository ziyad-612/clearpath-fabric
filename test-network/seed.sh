#!/usr/bin/env bash
set -e

ORDERER_CA=${PWD}/organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem
ORG1_CA=${PWD}/organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem
ORG2_CA=${PWD}/organizations/peerOrganizations/org2.example.com/tlsca/tlsca.org2.example.com-cert.pem

cc="clearpath"
ch="mychannel"

invoke() {
  local payload="$1"
  peer chaincode invoke \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls --cafile "$ORDERER_CA" \
    -C "$ch" -n "$cc" \
    --peerAddresses localhost:7051 --tlsRootCertFiles "$ORG1_CA" \
    --peerAddresses localhost:9051 --tlsRootCertFiles "$ORG2_CA" \
    --waitForEvent --waitForEventTimeout 60s \
    -c "$payload"
}

query() {
  local payload="$1"
  peer chaincode query \
    -C "$ch" -n "$cc" \
    --peerAddresses localhost:7051 --tlsRootCertFiles "$ORG1_CA" \
    -c "$payload"
}

echo "== Seed: Register Products =="

invoke '{"function":"RegisterProduct","Args":["BATCH-SA-001","Milk 1L","Almarai","2026-02-18"]}'
invoke '{"function":"RegisterProduct","Args":["BATCH-SA-002","Yogurt","Nadec","2026-02-18"]}'
invoke '{"function":"RegisterProduct","Args":["BATCH-SA-003","Ice Cream","SADAFCO","2026-02-18"]}'
invoke '{"function":"RegisterProduct","Args":["BATCH-SA-004","Coffee Beans","Barns","2026-02-18"]}'
invoke '{"function":"RegisterProduct","Args":["BATCH-SA-005","Laptop","Jarir","2026-02-18"]}'

echo "== Seed: Transactions (Saudi supply chain) =="

# Milk (Almarai)
invoke '{"function":"RecordTransaction","Args":["BATCH-SA-001","RiyadhWarehouse","Riyadh, KSA","4C"]}'
invoke '{"function":"RecordTransaction","Args":["BATCH-SA-001","Panda-Store-Riyadh-01","Riyadh - Panda Store 01","5C"]}'
invoke '{"function":"RecordTransaction","Args":["BATCH-SA-001","Panda-Store-Riyadh-02","Riyadh - Panda Store 02","5C"]}'

# Yogurt (Nadec)
invoke '{"function":"RecordTransaction","Args":["BATCH-SA-002","JeddahWarehouse","Jeddah, KSA","4C"]}'
invoke '{"function":"RecordTransaction","Args":["BATCH-SA-002","Danube-Jeddah-01","Jeddah - Danube 01","6C"]}'

# Ice Cream (SADAFCO)
invoke '{"function":"RecordTransaction","Args":["BATCH-SA-003","DammamColdStorage","Dammam, KSA","-18C"]}'
invoke '{"function":"RecordTransaction","Args":["BATCH-SA-003","Tamimi-Dammam-01","Dammam - Tamimi 01","-18C"]}'

# Coffee (Barns)
invoke '{"function":"RecordTransaction","Args":["BATCH-SA-004","RiyadhWarehouse","Riyadh, KSA","20C"]}'
invoke '{"function":"RecordTransaction","Args":["BATCH-SA-004","Barns-Riyadh-Branch-05","Riyadh - Barns Branch 05","20C"]}'

# Laptop (Jarir)
invoke '{"function":"RecordTransaction","Args":["BATCH-SA-005","RiyadhTechWarehouse","Riyadh, KSA","20C"]}'
invoke '{"function":"RecordTransaction","Args":["BATCH-SA-005","Jarir-Riyadh-Olaya","Riyadh - Jarir Olaya","20C"]}'
invoke '{"function":"RecordTransaction","Args":["BATCH-SA-005","Extra-Riyadh-Granada","Riyadh - Extra Granada","20C"]}'

echo "== Verify / Trace Sample =="

query '{"function":"TraceProduct","Args":["BATCH-SA-001"]}'
query '{"function":"TraceProduct","Args":["BATCH-SA-005"]}'

echo "✅ Seed completed."
