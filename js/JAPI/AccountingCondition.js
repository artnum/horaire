import { JAPI } from "./JAPI.js";

const NS = "AccountingCondition";

export class AccountingConditionAPI extends JAPI {
  constructor() {
    super();
  }

  static get instance() {
    if (AccountingConditionAPI.Instance === undefined) {
      AccountingConditionAPI.Instance = new AccountingConditionAPI();
    }
    return AccountingConditionAPI.Instance;
  }

  static get NS() {
    return NS;
  }

  lookup(docid) {
    return this.API.exec(AccountingConditionAPI.NS, "lookup", {
      docId: docid,
    });
  }

  get(docid) {
    return this.API.exec(AccountingConditionAPI.NS, "get", {
      condition: docid,
    });
  }

  set(condition) {
    return this.API.exec(AccountingConditionAPI.NS, "create", { condition });
  }
}

