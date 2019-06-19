import Storage from './';
import Router from 'eth-event-router';
import Web3 from 'web3';
import axios from 'axios';
import _ from 'lodash';

const URL = "https://mainnet.infura.io";
const BASE_ABI_URL = "https://api.etherscan.io/api?module=contract&action=getabi&address=";
const CONTRACT = "0x06012c8cf97bead5deae237070f9587f8e7a266d";

const fetchABI = async () => {
  let abiUrl = BASE_ABI_URL + CONTRACT;

  let r = await axios.get(abiUrl);
  let res = _.get(r, "data.result");
  if (!res) {
    throw new Error(`unable to fetch ABI from ${abiUrl}`);
  }

  let abi = res;
  if (typeof abi === 'string') {
    abi = JSON.parse(res);
  }

  if (!abi.length) {
    throw new Error(`unable to parse ABI: ${res}`);
  }

  return abi;
}

describe("Storage", ()=>{
  it("should store data", done=>{

    let s = new Storage({storeName: "TestDB"});
    s.store({
      key: "test",
      data: {
        field: "value"
      }
    }).then(()=>{
      s.read({
        key: "test"
      })
      .then(r=>{
        if(!r || r.length === 0) {
          return done(new Error("Should have stored data"));
        }
        s.remove({
          key: "test"
        })
        .then(()=>{
          s.read({
            key: "test"
          }).then(r=>{
            if(r && r.length > 0) {
              return done(new Error("Should have removed data"));
            }
            done();
          })
          .catch(done);
        })
        .catch(done);
      })
      .catch(done);
    })
    .catch(done);
  });

  let p = new Promise(async (done,err)=>{
    let s = new Storage({storeName: "TxnTestDB"});
    await s.removeDB("TxnTestDB");
    let web3Factory = () => new Web3(new Web3.providers.HttpProvider(URL));
    let web3 = web3Factory();
    let latest = await web3.eth.getBlockNumber();
    let abi = await fetchABI();
    let router = new Router({
      abi,
      web3Factory,
      address: CONTRACT
    });
    s.addToRouter(router);
    await router.start({
          fromBlock: latest - 5
          });
    await router.stop();
    let cnt = 0;
    for(let i=latest-5;i<=latest;++i) {
      let r = await s.read({
        key: ""+i
      });
      if(r && r.length > 0) {
        ++cnt;
      }
    }
    console.log("Wrote", cnt,"blocks to local storage");
    if(cnt === 0) {
      return err(new Error("Expected txns to be stored"));
    }
    done();
  });

  it("should act as event router handler", ()=>p).timeout(5000);
});
