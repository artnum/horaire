import { JAPI } from "./$script/src/JAPI/JAPI.js";
import { AccountingDocLineAPI } from "./$script/src/JAPI/AccountingDocLine.js";
import { base26 } from "./$script/src/lib/base26.js";
import format from "./$script/src/lib/format.js";
const NS = "AccountingDoc";

class AccountingDoc {
  constructor(API, doc) {
    this.API = API;
    this.id = String(doc.id);
    this.project = doc.project;
    this.reference = doc.reference;
    this.state = doc.state;
    this.related = null;
    this.variant = base26.encode(doc.variant);

    this.date = (() => {
      const date = new Date();
      const parts = doc.date
        .match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/)
        .map(Number);
      date.setUTCDate(parts[3]);
      date.setUTCMonth(parts[2] - 1);
      date.setUTCFullYear(parts[1]);
      date.setUTCHours(parts[4]);
      date.setUTCMinutes(parts[5]);
      return date;
    })();

    this.name = doc.name;
    this.description = doc.description;
    this.type = doc.type;
    this.condition = doc.condition;
    this.related = doc.related ?? null;
  }

  get freference() {
    return format.printf("%s_%s", this.reference, this.variant);
  }

  clone() {
    return new AccountingDoc(this.API, this.toJSON());
  }

  toJSON() {
    return {
      id: this.id,
      project: this.project,
      reference: this.reference,
      date: this.date.toISOString(),
      name: this.name,
      description: this.description,
      type: this.type,
      condition: this.condition,
      state: this.state,
      related: this.related,
      variant: base26.decode(this.variant),
    };
  }

  update() {
    return this.API.update(this);
  }

  delete() {
    return this.API.delete(this);
  }

  create() {
    return this.API.create(this);
  }
}

export default class AccountingDocAPI extends JAPI {
  constructor() {
    super();
    this.LineAPI = AccountingDocLineAPI.instance;
  }

  static get NS() {
    return NS;
  }

  get(id) {
    if (typeof id === "object") {
      id = id.id;
    }
    return this.API.exec(AccountingDocAPI.NS, "get", { id: id }).then(
      (doc) => new AccountingDoc(this, doc),
    );
  }

  listByProject(projectId) {
    if (typeof projectId === "object") {
      projectId = projectId.id;
    }
    return this.API.exec(AccountingDocAPI.NS, "listByProject", {
      project: projectId,
    }).then((docs) => docs.map((doc) => new AccountingDoc(this, doc)));
  }

  listByType(type) {
    if (typeof type === "object") {
      projectId = projectId.type;
    }
    return this.API.exec(AccountingDocAPI.NS, "listByType", {
      type: type,
    }).then((docs) => docs.map((doc) => new AccountingDoc(this, doc)));
  }

  listFromDocument(documentId) {
    if (typeof documentId === "object") {
      documentId = documentId.id;
    }
    return this.API.exec(AccountingDocAPI.NS, "listFromDocument", {
      document: documentId,
    }).then((docs) => docs.map((doc) => new AccountingDoc(this, doc)));
  }

  list() {
    return this.API.exec(AccountingDocAPI.NS, "list").then((docs) =>
      docs.map((doc) => new AccountingDoc(this, doc)),
    );
  }

  create(document) {
    if (document instanceof AccountingDoc) {
      document = document.toJSON();
    }

    if (!document.project) {
      document.project = null;
    }

    return this.API.exec(AccountingDocAPI.NS, "create", { document }).then(
      (doc) => new AccountingDoc(this, doc),
    );
  }

  createVariant(document) {
    if (document instanceof AccountingDoc) {
      document = document.toJSON();
      if (!document.id) {
        return reject("Project ID is required");
      }
    }

    return this.API.exec(AccountingDocAPI.NS, "createVariant", {
      document,
    }).then((doc) => new AccountingDoc(this, doc));
  }
  update(document) {
    if (document instanceof AccountingDoc) {
      document = document.toJSON();
    }
    if (!document.id) {
      return Promise.reject("Document ID is required");
    }
    return this.API.exec(AccountingDocAPI.NS, "update", { document }).then(
      (doc) => new AccountingDoc(this, doc),
    );
  }

  delete(document) {
    if (document instanceof AccountingDoc) {
      document = document.toJSON();
    }
    if (!document.id) {
      return Promise.reject("Document ID is required");
    }
    return this.API.exec(AccountingDocAPI.NS, "delete", {
      id: document.id,
    }).then((state) => {
      if (state.deleted.success) {
        return state.deleted;
      }
      throw new Error();
    });
  }

  getCurrent(projectId) {
    return this.API.exec(AccountingDocAPI.NS, "getCurrent", {
      project: projectId,
    }).then((doc) => {
      if (doc.id === null) {
        return null;
      }
      return new AccountingDoc(this, doc);
    });
  }

  nextStep(accDoc) {
    return this.API.exec(AccountingDocAPI.NS, "nextStep", { id: accDoc }).then(
      (newDocument) => {
        return newDocument;
      },
    );
  }

  getLines(id) {
    return AccountingDocLineAPI.instance.gets(id);
  }

  updateLines(lines, id) {
    return AccountingDocLineAPI.instance.set(lines, id);
  }

  pdf(id) {
    return this.API.exec(AccountingDocAPI.NS, "pdf", { id });
  }

  msword(id) {
    return this.API.exec(AccountingDocAPI.NS, "msword", { id });
  }

  probableNextReference(type) {
    return this.API.exec(AccountingDocAPI.NS, "getProbableNextReference", {
      type,
    });
  }
}

