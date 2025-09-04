function OldLoginInteface(UserUI) {
  if (OldLoginInteface._instance) {
    return OldLoginInteface._instance;
  }
  OldLoginInteface._instance = this;
  this.UserUI = UserUI;
}

OldLoginInteface.prototype = {
  unrender() {
    const container = document.querySelector(".ka-main-top");
    const userboxes = container.querySelectorAll(".ka-userbox");
    userboxes.forEach((userbox) => {
      userbox.remove();
    });
    container.querySelector(".ka-login").remove();
  },

  requestPassword(uid) {
    return new Promise((resolve, reject) => {
      const container = document.querySelector(".ka-main-top");
      const userboxes = container.querySelectorAll(".ka-userbox");

      if (document.querySelector(".ka-login")) {
        return;
      }

      userboxes.forEach((userbox) => {
        if (parseInt(userbox.dataset.userId) !== parseInt(uid))
          userbox.style.setProperty("display", "none");
      });

      const logForm = document.createElement("DIV");
      logForm.classList.add("ka-login");
      logForm.innerHTML = `
                <form class="ka-login-form" data-user-id="${uid}"><input placeholder="Mot de passe" type="password" name="motdepasse">
                <button type="submit">Authentifier</button>
                <button type="reset">Annuler</button></form>
            `;
      logForm.querySelector("form").addEventListener("submit", (event) => {
        event.preventDefault();
        const klogin = new KLogin();
        klogin
          .login(uid, new FormData(event.target).get("motdepasse"))
          .then((token) => {
            return KAPerson.load(uid);
          })
          .then((user) => {
            this.unrender();
            this.UserUI.loginSucceed({ uid: user.uid, workday: user.workday });
          })
          .catch((e) => {
            this.unrender();
            this.render();
            MsgInteractUI("error", "Erreur d'authentification");
          });
      });
      logForm.querySelector("form").addEventListener("reset", (event) => {
        this.unrender();
      });
      window.requestAnimationFrame(() => {
        container.appendChild(logForm);
      });
    });
  },

  render() {
    return new Promise((resolve, reject) => {
      KAPerson.listActive().then((people) => {
        const container = document.querySelector(".ka-main-top");
        for (const person of people) {
          const div = document.createElement("DIV");
          div.classList.add("ka-userbox");
          div.dataset.userId = person.uid;
          div.innerHTML = `${person.get("name")}`;
          window.requestAnimationFrame(() => {
            container.appendChild(div);
          });
          div.addEventListener("click", (event) => {
            this.requestPassword(person.uid);
          });
        }
      });
    });
  },
};

function NewLoginInterface(UserUI) {
  if (NewLoginInterface._instance) {
    return NewLoginInterface._instance;
  }
  NewLoginInterface._instance = this;
  this.UserUI = UserUI;
}

NewLoginInterface.prototype = {
  unrender() {
    document.querySelector(".ka-main-top").innerHTML = "";
  },
  doLogin(uid, password) {
    return new Promise((resolve, reject) => {
      const klogin = new KLogin();

      klogin
        .login(uid, password)
        .then((token) => {
          return KAPerson.load(token.uid);
        })
        .then((user) => {
          this.unrender();
          this.UserUI.loginSucceed({ uid: uid, workday: user.workday });
        })
        .catch((_) => {
          MsgInteractUI("error", "Erreur d'authentification");
        });
    });
  },
  render(params) {
    const container = document.querySelector(".ka-main-top");
    const form = document.createElement("FORM");
    const username = params.has("user") ? params.get("user") : "";
    form.classList.add("ka-login-form");
    form.innerHTML = `
            <label><span>Utilisateur</span><input type="text" name="username" autocomplete="username" value="${username}"/></label>
            <label><span>Mot de passe</span><input type="password" autocomplete="current-password" name="motdepasse" /></label>
            <button type="submit">Se connecter</button>
        `;
    container.appendChild(form);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formdata = new FormData(event.target);
      const klogin = new KLogin();
      klogin
        .getUserid(formdata.get("username"))
        .then((userid) => {
          this.doLogin(userid, formdata.get("motdepasse"));
        })
        .catch((_) => {
          MsgInteractUI("error", "Erreur d'authentification");
        });
    });
  },
};

function InvitationLoginInterface(UserUI) {
  if (InvitationLoginInterface._instance) {
    return InvitationLoginInterface._instance;
  }
  InvitationLoginInterface._instance = this;
  this.UserUI = UserUI;
}

InvitationLoginInterface.prototype = {
  unrender() {
    document.querySelector(".ka-main-top").innerHTML = "";
  },
  doLogin(uid, password) {
    return new Promise((resolve, reject) => {
      const klogin = new KLogin();
      const container = document.querySelector(".ka-main-top");

      klogin
        .login(uid, password)
        .then((result) => {
          return KAPerson.load(result.uid);
        })
        .then((user) => {
          this.unrender();
          this.UserUI.loginSucceed({ uid: uid, workday: user.workday });
        })
        .catch((_) => {
          MsgInteractUI("error", "Erreur d'authentification");
        });
    });
  },
  render(invitation) {
    const klogin = new KLogin();
    klogin
      .getInvitationInfo(invitation)
      .then((information) => {
        const container = document.querySelector(".ka-main-top");
        const form = document.createElement("form");
        form.classList.add("ka-login-form");
        form.innerHTML = `
                <span class="title">Invitation pour ${information.name}</span>
                <label>Nom d'utilisateur <input type="text" readonly="true" name="username" value="${information.username}" aria-hidden="true" autocomplete="username"></label>
                <label><span>Nouveau mot de passe </span><input type="password" name="pass1" autocomplete="new-password"></label>
                <label><span>Répéter mot de passe </span><input type="password" name="pass2" autocomplete="new-password"></label>
                <button type="submit">Enregistrer</button>
            `;
        container.appendChild(form);
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          const formdata = new FormData(event.target);
          const valid = this.check_password(formdata.get("pass1"));
          if (!valid || formdata.get("pass1") != formdata.get("pass2")) {
            return MsgInteractUI(
              "error",
              valid ? "Mot de passe différents" : "Mot de passe invalide",
            );
          }
          const klogin = new KLogin();
          klogin
            .setInvitationPassword(invitation, formdata.get("pass1"))
            .then((userid) => {
              const currentURL = new URL(window.location.href);
              currentURL.search = "";
              currentURL.searchParams.append("user", information.username);
              window.location = currentURL.href;
            });
        });
      })
      .catch((e) => {
        return MsgInteractUI("error", "Invitation inéxistante");
      });
  },
  check_password(password) {
    password = String(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
      password,
    );
    const repeatingSequence = /(.)\1{2,}/.test(password);
    const sequentialNumbers = /(012|123|234|345|456|567|678|789)/.test(
      password,
    );

    const isLongEnough = password.length >= 8;
    if (!isLongEnough || repeatingSequence || sequentialNumbers) {
      return false;
    }
    if (
      (hasUppercase && hasLowercase) ||
      (hasUppercase && hasNumbers) ||
      (hasLowercase && hasNumbers) ||
      (hasSpecialChar && hasNumbers) ||
      (hasSpecialChar && hasUppercase) ||
      (hasSpecialChar && hasLowercase)
    ) {
      return true;
    }

    return false;
  },
};

function UserInteractUI() {
  this.eventTarget = new EventTarget();
  this.loginSuccessResolve;
}

UserInteractUI.prototype.render = function () {
  return new Promise((resolve) => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("invitation")) {
      return new InvitationLoginInterface(this).render(
        params.get("invitation"),
      );
    }
    if (!KAAL.login || !KAAL.login.new) {
      return new OldLoginInteface(this).render(params);
    }
    return new NewLoginInterface(this).render(params);
  });
};

UserInteractUI.prototype.loginSucceed = function (user) {
  this.loginSuccessResolve(user);
};

UserInteractUI.prototype.run = function () {
  return new Promise((resolve, reject) => {
    this.loginSuccessResolve = resolve;

    const klogin = new KLogin();
    klogin
      .getToken()
      .then((token) => {
        if (!token) {
          throw new Error("Invalid token");
        }
        klogin
          .check(token)
          .then((login) => {
            return klogin.getUser();
          })
          .then((userid) => {
            return KAPerson.load(userid);
          })
          .then((user) => {
            this.loginSucceed({ uid: user.uid, workday: user.workday });
          })
          .catch((e) => {
            return this.render();
          });
      })
      .catch((_) => {
        this.render();
      });
  });
};

UserInteractUI.prototype.addEventListener = function (
  type,
  listener,
  options = {},
) {
  this.eventTarget.addEventListener(type, listener, options);
};

