'use strict';

const { Contract } = require('fabric-contract-api');
const crypto = require('crypto');

class ClearPathContract extends Contract {

    // ── Helper: get deterministic timestamp ──
    _getTxTime(ctx) {
        const ts = ctx.stub.getTxTimestamp();
        const sec = typeof ts.seconds === 'object' && ts.seconds !== null
            ? ts.seconds.toNumber() : Number(ts.seconds);
        return new Date((sec * 1000) + Math.floor(Number(ts.nanos || 0) / 1e6)).toISOString();
    }

    // ── Helper: key existence check ──
    async _exists(ctx, key) {
        const b = await ctx.stub.getState(key);
        return !!(b && b.length > 0);
    }

    // ── Helper: write one or more notifications in a single state write ──
    async _saveNotifs(ctx, batchID, notifList) {
        if (!notifList || notifList.length === 0) return;
        const raw = await ctx.stub.getState('NOTIFICATIONS');
        const arr = (raw && raw.length > 0) ? JSON.parse(raw.toString()) : [];
        const txID = ctx.stub.getTxID();
        const ts = this._getTxTime(ctx);
        notifList.forEach((n, i) => arr.push({
            id: `${txID}_${i}`,
            batchID,
            message: n.message,
            type: n.type,
            timestamp: ts,
            read: false
        }));
        while (arr.length > 200) arr.shift();
        await ctx.stub.putState('NOTIFICATIONS', Buffer.from(JSON.stringify(arr)));
    }

    // ═══════════════════════════════════════════
    //  INIT
    // ═══════════════════════════════════════════
    async InitLedger(ctx) {
        // Default admin account
        const hash = crypto.createHash('sha256').update('admin123').digest('hex');
        const admin = {
            userID: 'admin', name: 'System Administrator',
            email: 'admin@clearpath.com', role: 'Admin',
            passwordHash: hash, status: 'Active',
            createdAt: this._getTxTime(ctx)
        };
        await ctx.stub.putState('USER_admin', Buffer.from(JSON.stringify(admin)));
        // Empty notifications store
        await ctx.stub.putState('NOTIFICATIONS', Buffer.from(JSON.stringify([])));
        console.info('Ledger Initialized');
    }

    // ═══════════════════════════════════════════
    //  USER MANAGEMENT
    // ═══════════════════════════════════════════
    async CreateUser(ctx, userID, name, email, role, password) {
        if (await this._exists(ctx, 'USER_' + userID))
            throw new Error(`User "${userID}" already exists`);

        const validRoles = ['Admin', 'Manufacturer', 'Logistics', 'Retailer', 'Consumer'];
        if (!validRoles.includes(role))
            throw new Error(`Invalid role. Allowed: ${validRoles.join(', ')}`);

        const user = {
            userID, name, email, role,
            passwordHash: crypto.createHash('sha256').update(password).digest('hex'),
            status: 'Active',
            createdAt: this._getTxTime(ctx)
        };
        await ctx.stub.putState('USER_' + userID, Buffer.from(JSON.stringify(user)));
        return JSON.stringify({ userID, name, email, role, status: 'Active' });
    }

    async AuthenticateUser(ctx, userID, password) {
        const raw = await ctx.stub.getState('USER_' + userID);
        if (!raw || raw.length === 0)
            return JSON.stringify({ success: false, message: 'User not found' });

        const user = JSON.parse(raw.toString());
        if (user.status === 'Disabled')
            return JSON.stringify({ success: false, message: 'Account is disabled' });

        const hash = crypto.createHash('sha256').update(password).digest('hex');
        if (user.passwordHash !== hash)
            return JSON.stringify({ success: false, message: 'Invalid password' });

        return JSON.stringify({
            success: true,
            userID: user.userID, name: user.name,
            role: user.role, email: user.email
        });
    }

    async GetUser(ctx, userID) {
        const raw = await ctx.stub.getState('USER_' + userID);
        if (!raw || raw.length === 0) throw new Error(`User "${userID}" not found`);
        const { passwordHash, ...safe } = JSON.parse(raw.toString());
        return JSON.stringify(safe);
    }

    async GetAllUsers(ctx) {
        const results = [];
        const it = await ctx.stub.getStateByRange('USER_', 'USER_~');
        let r = await it.next();
        while (!r.done) {
            const { passwordHash, ...safe } = JSON.parse(r.value.value.toString());
            results.push(safe);
            r = await it.next();
        }
        await it.close();
        return JSON.stringify(results);
    }

    async UpdateUserRole(ctx, targetUserID, newRole) {
        const raw = await ctx.stub.getState('USER_' + targetUserID);
        if (!raw || raw.length === 0) throw new Error(`User "${targetUserID}" not found`);
        const validRoles = ['Admin', 'Manufacturer', 'Logistics', 'Retailer', 'Consumer'];
        if (!validRoles.includes(newRole)) throw new Error(`Invalid role`);
        const user = JSON.parse(raw.toString());
        user.role = newRole;
        await ctx.stub.putState('USER_' + targetUserID, Buffer.from(JSON.stringify(user)));
        return JSON.stringify({ success: true });
    }

    async DisableUser(ctx, targetUserID) {
        const raw = await ctx.stub.getState('USER_' + targetUserID);
        if (!raw || raw.length === 0) throw new Error(`User "${targetUserID}" not found`);
        const user = JSON.parse(raw.toString());
        if (user.role === 'Admin') throw new Error('Cannot disable an Admin account');
        user.status = 'Disabled';
        await ctx.stub.putState('USER_' + targetUserID, Buffer.from(JSON.stringify(user)));
        return JSON.stringify({ success: true });
    }

    async EnableUser(ctx, targetUserID) {
        const raw = await ctx.stub.getState('USER_' + targetUserID);
        if (!raw || raw.length === 0) throw new Error(`User "${targetUserID}" not found`);
        const user = JSON.parse(raw.toString());
        user.status = 'Active';
        await ctx.stub.putState('USER_' + targetUserID, Buffer.from(JSON.stringify(user)));
        return JSON.stringify({ success: true });
    }

    async UpdateProfile(ctx, userID, name, email) {
        const raw = await ctx.stub.getState('USER_' + userID);
        if (!raw || raw.length === 0) throw new Error(`User "${userID}" not found`);
        const user = JSON.parse(raw.toString());
        user.name = name;
        user.email = email;
        await ctx.stub.putState('USER_' + userID, Buffer.from(JSON.stringify(user)));
        return JSON.stringify({ success: true, name, email });
    }

    // ═══════════════════════════════════════════
    //  PRODUCT MANAGEMENT
    // ═══════════════════════════════════════════
    async RegisterProduct(ctx, batchID, productName, manufacturer, productionDate, minTemp, maxTemp, minHum, maxHum) {
        if (await this._exists(ctx, 'PROD_' + batchID))
            throw new Error(`Product "${batchID}" already exists`);

        const product = {
            batchID, productName, manufacturer, productionDate,
            currentOwner: manufacturer,
            status: 'Registered',
            transactions: [],
            iotReadings: [],
            registeredAt: this._getTxTime(ctx),
            limits: {
                minTemp: minTemp ? parseFloat(minTemp) : null,
                maxTemp: maxTemp ? parseFloat(maxTemp) : 30,
                minHum: minHum ? parseFloat(minHum) : null,
                maxHum: maxHum ? parseFloat(maxHum) : 85
            }
        };
        await ctx.stub.putState('PROD_' + batchID, Buffer.from(JSON.stringify(product)));
        await this._saveNotifs(ctx, batchID, [{
            message: `📦 Product ${batchID} (${productName}) registered by ${manufacturer}`,
            type: 'info'
        }]);
        return JSON.stringify(product);
    }

    async RecordTransaction(ctx, batchID, newOwner, location, temperature, minTemp, maxTemp, minHum, maxHum) {
        // Support old key format (no prefix) for backward compatibility
        let raw = await ctx.stub.getState('PROD_' + batchID);
        if (!raw || raw.length === 0) raw = await ctx.stub.getState(batchID);
        if (!raw || raw.length === 0) throw new Error(`Product "${batchID}" does not exist`);

        const product = JSON.parse(raw.toString());
        const txTime = this._getTxTime(ctx);
        const transaction = {
            txID: ctx.stub.getTxID(),
            from: product.currentOwner,
            to: newOwner,
            location,
            temperature,
            timestamp: txTime
        };
        product.currentOwner = newOwner;
        product.status = 'In Transit';
        product.transactions.push(transaction);

        if (minTemp || maxTemp || minHum || maxHum) {
            product.limits = product.limits || { maxTemp: 30, maxHum: 85, minTemp: null, minHum: null };
            if (minTemp) product.limits.minTemp = parseFloat(minTemp);
            if (maxTemp) product.limits.maxTemp = parseFloat(maxTemp);
            if (minHum) product.limits.minHum = parseFloat(minHum);
            if (maxHum) product.limits.maxHum = parseFloat(maxHum);
        }

        // Smart Contract rules
        const notifs = [];
        const limitMaxTemp = (product.limits && product.limits.maxTemp !== undefined && product.limits.maxTemp !== null) ? product.limits.maxTemp : 30;
        const limitMinTemp = (product.limits && product.limits.minTemp !== undefined) ? product.limits.minTemp : null;
        
        const tempNum = parseFloat(temperature);
        if (!isNaN(tempNum)) {
            if (limitMaxTemp !== null && tempNum > limitMaxTemp) {
                product.status = 'Alert';
                notifs.push({
                    message: `⚠️ HIGH TEMP ALERT: Product ${batchID} at ${temperature}°C (> ${limitMaxTemp}°C) in ${location}`,
                    type: 'warning'
                });
            } else if (limitMinTemp !== null && tempNum < limitMinTemp) {
                product.status = 'Alert';
                notifs.push({
                    message: `⚠️ LOW TEMP ALERT: Product ${batchID} at ${temperature}°C (< ${limitMinTemp}°C) in ${location}`,
                    type: 'warning'
                });
            }
        }
        
        const ownerLow = newOwner.toLowerCase();
        if (ownerLow.includes('retailer') || ownerLow.includes('retail')) {
            product.status = 'Delivered';
            notifs.push({
                message: `✅ DELIVERED: Product ${batchID} confirmed at ${newOwner} — ${location}`,
                type: 'success'
            });
        }

        await ctx.stub.putState('PROD_' + batchID, Buffer.from(JSON.stringify(product)));
        if (notifs.length > 0) await this._saveNotifs(ctx, batchID, notifs);
        return JSON.stringify(transaction);
    }

    async TraceProduct(ctx, batchID) {
        let raw = await ctx.stub.getState('PROD_' + batchID);
        if (!raw || raw.length === 0) raw = await ctx.stub.getState(batchID);
        if (!raw || raw.length === 0) throw new Error(`Product "${batchID}" does not exist`);
        return raw.toString();
    }

    async VerifyProduct(ctx, batchID) {
        let raw = await ctx.stub.getState('PROD_' + batchID);
        if (!raw || raw.length === 0) raw = await ctx.stub.getState(batchID);
        if (!raw || raw.length === 0)
            return JSON.stringify({ authentic: false, message: `Product "${batchID}" NOT FOUND on blockchain` });
        const p = JSON.parse(raw.toString());
        return JSON.stringify({
            authentic: true,
            message: `Product "${batchID}" is AUTHENTIC`,
            productName: p.productName,
            manufacturer: p.manufacturer,
            status: p.status,
            currentOwner: p.currentOwner
        });
    }

    async GetAllProducts(ctx) {
        const results = [];
        const it = await ctx.stub.getStateByRange('PROD_', 'PROD_~');
        let r = await it.next();
        while (!r.done) { results.push(JSON.parse(r.value.value.toString())); r = await it.next(); }
        await it.close();
        return JSON.stringify(results);
    }

    async SearchProducts(ctx, keyword) {
        const kw = keyword.toLowerCase();
        const results = [];
        const it = await ctx.stub.getStateByRange('PROD_', 'PROD_~');
        let r = await it.next();
        while (!r.done) {
            const p = JSON.parse(r.value.value.toString());
            if (
                p.batchID.toLowerCase().includes(kw) ||
                p.productName.toLowerCase().includes(kw) ||
                p.manufacturer.toLowerCase().includes(kw) ||
                p.currentOwner.toLowerCase().includes(kw) ||
                (p.status || '').toLowerCase().includes(kw)
            ) results.push(p);
            r = await it.next();
        }
        await it.close();
        return JSON.stringify(results);
    }

    // ═══════════════════════════════════════════
    //  IoT INTEGRATION
    // ═══════════════════════════════════════════
    async RecordIoTReading(ctx, batchID, deviceID, sensorType, value, unit) {
        let raw = await ctx.stub.getState('PROD_' + batchID);
        if (!raw || raw.length === 0) throw new Error(`Product "${batchID}" does not exist`);
        const product = JSON.parse(raw.toString());
        if (!product.iotReadings) product.iotReadings = [];

        const reading = {
            deviceID, sensorType,
            value: parseFloat(value),
            unit,
            timestamp: this._getTxTime(ctx)
        };
        product.iotReadings.push(reading);

        const notifs = [];
        const numVal = parseFloat(value);
        const limitMaxTemp = (product.limits && product.limits.maxTemp !== undefined && product.limits.maxTemp !== null) ? product.limits.maxTemp : 30;
        const limitMinTemp = (product.limits && product.limits.minTemp !== undefined) ? product.limits.minTemp : null;
        const limitMaxHum = (product.limits && product.limits.maxHum !== undefined && product.limits.maxHum !== null) ? product.limits.maxHum : 85;
        const limitMinHum = (product.limits && product.limits.minHum !== undefined) ? product.limits.minHum : null;

        if (sensorType.toLowerCase() === 'temperature') {
            if (limitMaxTemp !== null && numVal > limitMaxTemp) {
                notifs.push({ message: `🌡️ IoT: ${batchID} temp=${value}${unit} > ${limitMaxTemp} (${deviceID})`, type: 'warning' });
                product.status = 'Alert';
            } else if (limitMinTemp !== null && numVal < limitMinTemp) {
                notifs.push({ message: `🌡️ IoT: ${batchID} temp=${value}${unit} < ${limitMinTemp} (${deviceID})`, type: 'warning' });
                product.status = 'Alert';
            }
        }
        if (sensorType.toLowerCase() === 'humidity') {
            if (limitMaxHum !== null && numVal > limitMaxHum) {
                notifs.push({ message: `💧 IoT: ${batchID} humidity=${value}${unit} > ${limitMaxHum} (${deviceID})`, type: 'warning' });
                product.status = 'Alert';
            } else if (limitMinHum !== null && numVal < limitMinHum) {
                notifs.push({ message: `💧 IoT: ${batchID} humidity=${value}${unit} < ${limitMinHum} (${deviceID})`, type: 'warning' });
                product.status = 'Alert';
            }
        }

        await ctx.stub.putState('PROD_' + batchID, Buffer.from(JSON.stringify(product)));
        if (notifs.length > 0) await this._saveNotifs(ctx, batchID, notifs);
        return JSON.stringify(reading);
    }

    // ═══════════════════════════════════════════
    //  REPORTS
    // ═══════════════════════════════════════════
    async GenerateReport(ctx, startDate, endDate) {
        const start = startDate ? new Date(startDate).getTime() : 0;
        const end = endDate ? new Date(endDate).getTime() : new Date(this._getTxTime(ctx)).getTime();
        const products = [];
        let totalTx = 0, totalIoT = 0;
        const byManufacturer = {}, byStatus = {};

        const it = await ctx.stub.getStateByRange('PROD_', 'PROD_~');
        let r = await it.next();
        while (!r.done) {
            const p = JSON.parse(r.value.value.toString());
            const t = new Date(p.registeredAt || p.productionDate).getTime();
            if (t >= start && t <= end) {
                products.push(p);
                totalTx += (p.transactions || []).length;
                totalIoT += (p.iotReadings || []).length;
                byManufacturer[p.manufacturer] = (byManufacturer[p.manufacturer] || 0) + 1;
                byStatus[p.status] = (byStatus[p.status] || 0) + 1;
            }
            r = await it.next();
        }
        await it.close();

        return JSON.stringify({
            generatedAt: this._getTxTime(ctx),
            period: { startDate, endDate },
            summary: { totalProducts: products.length, totalTransactions: totalTx, totalIoTReadings: totalIoT, byManufacturer, byStatus },
            products
        });
    }

    // ═══════════════════════════════════════════
    //  NOTIFICATIONS
    // ═══════════════════════════════════════════
    async GetNotifications(ctx) {
        const raw = await ctx.stub.getState('NOTIFICATIONS');
        if (!raw || raw.length === 0) return JSON.stringify([]);
        const arr = JSON.parse(raw.toString());
        return JSON.stringify([...arr].reverse());
    }

    async MarkAllNotificationsRead(ctx) {
        const raw = await ctx.stub.getState('NOTIFICATIONS');
        if (!raw || raw.length === 0) return JSON.stringify({ success: true });
        const arr = JSON.parse(raw.toString());
        arr.forEach(n => n.read = true);
        await ctx.stub.putState('NOTIFICATIONS', Buffer.from(JSON.stringify(arr)));
        return JSON.stringify({ success: true });
    }

    // ═══════════════════════════════════════════
    //  LEGACY HELPER (kept for compatibility)
    // ═══════════════════════════════════════════
    async ProductExists(ctx, batchID) {
        return this._exists(ctx, 'PROD_' + batchID);
    }
}

module.exports = ClearPathContract;