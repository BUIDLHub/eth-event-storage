import Local from './LocalForage';
import * as yup from 'yup';

const schema = yup.object({
  storeName: yup.string().required("Storage missing storeName")
})

let inst = null;

export default class Storage {
  static get instance() {
    if(!inst) {
      throw new Error("Did not call Storage constructor first");
    }
    return inst;
  }

  constructor(props) {
    inst = this;
    schema.validateSync(props);
    this.name = props.storeName;
    [
      'addToRouter'
    ].forEach(fn=>this[fn]=this[fn].bind(this));

    [
      'store',
      'storeBulk',
      'read',
      'readAll',
      'find',
      'update',
      'remove',
      'removeDB',
      'iterate'
    ].forEach(fn=>this[fn]=(props)=>{
      return Local.instance[fn]({
        ...props,
        database: this.name
      })
    });
  }

  addToRouter(router) {
    router.use(async (txns, next, end)=>{
      let block = txns[0].blockNumber;
      await Local.instance.store({
        database: this.name,
        key: ""+block,
        data: {txns}
      });
      next();
    });
  }
}
