// ecosystem.config.js
module.exports = {
    apps: [
        {
            name: "cmvault-web", // A descriptive name for your application
            script: "npm", // The executable command runner
            args: "start", // The npm script to run (equivalent to npm run start)
            exec_mode: "cluster", // Recommended for Next.js to use multiple cores
            instances: "1", // Use all available CPU cores
            wait_ready: true, // Wait for the 'ready' signal from Next.js
            listen_timeout: 5000,
            env: {
                NODE_ENV: "production",
                PORT: 9010 // Set the specific port here
            }
        }
    ]
};