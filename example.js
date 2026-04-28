const robloxCode = require('./main.js');

const api = new robloxCode({
    cache: true,
    ttl: 300000,
    updateInterval: 100,
});

async function run() {
    //const updateResult = await api.update();
    //console.log(updateResult);
    
    const call = await api.getCodeof('blox frut');
    console.log(call);

   //const results = await api.search("fruit");
    //console.log(results);
}

run();