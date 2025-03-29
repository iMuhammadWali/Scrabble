import sql, {ConnectionPool, connect} from 'mssql'

// This config is taken from the SQL SDK page 
const dbLoginConfig = {
    user: 'sa',
    password: 'dbsdubber',
    database: 'testDB',
    server: 'localhost',
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
        // Create a new connection pool and then use the connect on that pool.
        const pool = await new sql.ConnectionPool(dbLoginConfig).connect();
        console.log("Connected to database");
        return pool;
    }
    catch (err)
    {
        console.log('An error occured');
        process.exit(1); // Have to see what this is used for.
        // return null;
    }
}

export const poolPromise = connectToDB();