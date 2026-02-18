'use strict';

const { Contract } = require('fabric-contract-api');

class ClearPathContract extends Contract {

    async InitLedger(ctx) {
        console.info('Ledger Initialized');
    }

    async RegisterProduct(ctx, batchID, productName, manufacturer, productionDate) {
        const exists = await this.ProductExists(ctx, batchID);
        if (exists) {
            throw new Error(`Product ${batchID} already exists`);
        }

        const product = {
            batchID,
            productName,
            manufacturer,
            productionDate,
            currentOwner: manufacturer,
            status: 'Registered',
            transactions: []
        };

        await ctx.stub.putState(batchID, Buffer.from(JSON.stringify(product)));
        return JSON.stringify(product);
    }

    async RecordTransaction(ctx, batchID, newOwner, location, temperature) {
    const productBytes = await ctx.stub.getState(batchID);
    if (!productBytes || productBytes.length === 0) {
        throw new Error(`Product ${batchID} does not exist`);
    }

    const product = JSON.parse(productBytes.toString());

    // ✅ Deterministic timestamp across endorsing peers
    const ts = ctx.stub.getTxTimestamp(); // protobuf Timestamp
    const txTimestamp = {
        seconds: ts.seconds.toString(),  // store as string to avoid Long issues
        nanos: ts.nanos
    };

    const transaction = {
        from: product.currentOwner,
        to: newOwner,
        location,
        temperature,
        timestamp: txTimestamp
    };

    product.currentOwner = newOwner;
    product.status = 'In Transit';
    product.transactions.push(transaction);

    await ctx.stub.putState(batchID, Buffer.from(JSON.stringify(product)));
    return JSON.stringify(transaction);
}


    async TraceProduct(ctx, batchID) {
        const productBytes = await ctx.stub.getState(batchID);
        if (!productBytes || productBytes.length === 0) {
            throw new Error(`Product ${batchID} does not exist`);
        }
        return productBytes.toString();
    }

    async VerifyProduct(ctx, batchID) {
        const exists = await this.ProductExists(ctx, batchID);
        if (!exists) {
            return `Product ${batchID} NOT FOUND`;
        }
        return `Product ${batchID} is AUTHENTIC`;
    }

    async ProductExists(ctx, batchID) {
        const productBytes = await ctx.stub.getState(batchID);
        return productBytes && productBytes.length > 0;
    }
}

module.exports = ClearPathContract;
