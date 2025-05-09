import sql from 'mssql'
import dotenv from 'dotenv';
dotenv.config();

// This config is taken from the SQL SDK page 
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
        // creating a manual pool to avoid the explicit creating of many pool created by the SQL server behind the scenes.
        const pool = await new sql.ConnectionPool(dbLoginConfig).connect();
        console.log("Connected to database");
        return pool;
    }
    catch (err)
    {
        // Which is probably that the database server is not running on my laptop currently.
        // console.log('An error occured while connecting to the database.');
        console.log(err);
        console.log('An error occured while connecting to the database: ' + err);
        process.exit(1); // Have to see what this is used for.
        // return null;
    }
}

export const poolPromise = connectToDB();