import sql  from "mssql";
import "dotenv/config"

const config1 = {
    server: process.env.SERVER1,
    database: process.env.DATABASE1,
    user: process.env.USER1,
    password: process.env.PASSWORD1,
    // port: Number(process.env.DB_PORT1),
    options: {
        encrypt: false,
        enableArithAbort: true,
        trustServerCertificate: true,
    },
    requestTimeout: 6000000,
    connectionTimeout: 30000,
};
const config2 = {
    server: process.env.SERVER2,
    database: process.env.DATABASE2,
    user: process.env.USER2,
    password: process.env.PASSWORD2,
    // port: Number(process.env.DB_PORT1),
    options: {
        encrypt: false,
        enableArithAbort: true,
        trustServerCertificate: true,
    },
    requestTimeout: 6000000,
    connectionTimeout: 30000,
};

let pool1, pool2;

const connectDB = async () => {
    try {
        pool1 = await new sql.ConnectionPool(config1).connect();
        console.log(`Connected to DB1: ${process.env.SERVER1} using ${process.env.USER1}`);

        pool2 = await new sql.ConnectionPool(config2).connect();
        console.log(`Connected to DB2: ${process.env.SERVER2} using ${process.env.USER2}`);
    } catch (err) {
        console.error("Database connection failed!", err);
        throw err;
    }
};

const getPool1 = () => {
    if (!pool1) throw new Error("DB1 not connected");
    return pool1;
};

const getPool2 = () => {
    if (!pool2) throw new Error("DB2 not connected");
    return pool2;
};
// getPool1 -> for UAT Connection 
// getPool2 -> for Live Connection
export { connectDB, getPool1 ,getPool2 };

