import sql from 'mssql'
import dotenv from 'dotenv';
dotenv.config();

const dbLoginConfig = {
    user: process.env.DB_USER as string,
    password: process.env.DB_PASSWORD as string,
    database: process.env.DB_NAME as string,
    server: process.env.DB_SERVER_NAME as string,

    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: true, // for azure
        trustServerCertificate: true // change to true for local dev / self-signed certs
    }
}

async function connectToDB() {
    try 
    {
        const pool = await new sql.ConnectionPool(dbLoginConfig).connect();
        console.log("Connected to database");
        return pool;
    }
    catch (err)
    {
        console.error('An error occured while connecting to the database: ' + err);
        process.exit(1);
    }
}

export const poolPromise = connectToDB();