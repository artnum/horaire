import AVSUtil from "../lib/AVSUtil.js";

export default class SchemaModel {
  static schema = {};

  constructor(data = {}) {
    this.fromObject(data);
    this.validationErrors = {};
  }

  static toBoolean(input) {
    return !!input;
  }

  /* Conversion function */
  static toInteger(input) {
    const int = parseInt(input, 10);
    if (Number.isNaN(int) || !Number.isFinite(int)) {
      return null;
    }
    return int;
  }

  static toPrice(input) {
    input = SchemaModel.toFloat(input);
    if (input == null) {
      return "";
    }
    return input.toFixed(2);
  }

  static toFloat(input) {
    const float = parseFloat(input);
    if (Number.isNaN(float) || !Number.isFinite(float)) {
      return null;
    }
    return float;
  }

  static toString(input) {
    const tempElement = document.createElement("div");
    tempElement.textContent = input;

    return tempElement.innerHTML.normalize("NFC");
  }

  static toDate(input) {
    const date = new Date(input);
    const ts = date.getTime();
    if (isNaN(ts) || !isFinite(ts)) {
      return new Date();
    }
    return date;
  }

  static toBase64(input) {
    const str = String(input).trim();
    const base64Regex = /^[A-Za-z0-9+\/\-_]*$/;
    if (!base64Regex.test(str)) {
      return null;
    }

    try {
      const standardStr = str.replace(/-/g, "+").replace(/_/g, "/");
      atob(standardStr);
    } catch {
      return null;
    }

    return str;
  }

  /* validation functions */
  /**
   * @param value {string}
   * @return {boolean}
   */
  static isNumeric(value) {
    return /^\d+$/.test(String(value));
  }

  /**
   * @param value {string}
   * @return {boolean}
   */
  static isAVSNumber(value) {
    return AVSUtil.check(String(value));
  }

  /**
   * @return {boolean}
   */
  static isInteger(value) {
    if (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value % 1 === 0
    ) {
      return true;
    }
    if (typeof value === "number") {
      return false;
    }
    if (!SchemaModel.isNumeric(value)) {
      return false;
    }
    return SchemaModel.isInteger(parseInt(value, 10));
  }

  static isISO3166CountryCode(value) {
    value = String(value);
    if (value.length !== 2) {
      return false;
    }
    /* one day add full check but not yet */
    return true;
  }

  /* *** */
  static createDefaults() {
    const defaults = {};
    for (const [key, [_, defaultValue]] of Object.entries(this.schema)) {
      defaults[key] =
        typeof defaultValue === "function" && defaultValue.name === ""
          ? defaultValue()
          : defaultValue;
    }
    return defaults;
  }

  /**
   * @param form {(string|HTMLFormElement)}
   */
  applyToForm(form) {
    if (typeof form === "string") {
      form = document.getElementById(form);
    }

    for (const [key, [convert, defaultValue]] of Object.entries(
      this.constructor.schema,
    )) {
      if (!this[key]) {
        this[key] = defaultValue;
      }

      const input = form.querySelector(`[name="${key}"]`);
      if (!input) {
        continue;
      }
      input.value = this[key];
    }
  }

  fromFormData(formData) {
    this.validationErrors = {}; // Reset errors
    for (const [key, [convert, defaultValue, validate]] of Object.entries(
      this.constructor.schema,
    )) {
      const isSubmodel =
        typeof defaultValue === "function" && defaultValue.name === "";
      if (isSubmodel) {
        this[key] = defaultValue();
        const subSchema = this[key].constructor.schema;
        for (const [
          subKey,
          [subConvert, subDefault, subValidate],
        ] of Object.entries(subSchema)) {
          const formKey = `${key}.${subKey}`;
          if (formData.has(formKey)) {
            const value = subConvert(formData.get(formKey));
            this[key][subKey] = value !== null ? value : subDefault;
            // Validate if a validation function exists
            if (subValidate && typeof subValidate === "function") {
              const error = subValidate(this[key][subKey]);
              if (error) {
                this.validationErrors[formKey] = error;
              }
            }
          }
        }
      } else {
        const value = formData.has(key) ? convert(formData.get(key)) : null;
        this[key] = value !== null ? value : defaultValue;
        // Validate if a validation function exists
        if (validate && typeof validate === "function") {
          const error = validate(this[key]);
          if (error) {
            this.validationErrors[key] = error;
          }
        }
      }
    }

    // Optional: Throw an error if there are validation issues
    if (Object.keys(this.validationErrors).length > 0) {
      throw new Error(
        "Validation failed: " + JSON.stringify(this.validationErrors),
      );
    }
  }

  fromObject(object) {
    for (const [key, [convert, defaultValue]] of Object.entries(
      this.constructor.schema,
    )) {
      const isSubmodel =
        typeof defaultValue === "function" && defaultValue.name === "";
      const value = object[key] !== undefined ? convert(object[key]) : null;
      this[key] =
        value === null && isSubmodel
          ? defaultValue()
          : value !== null
            ? value
            : defaultValue;
    }
  }

  toJSON() {
    const json = {};
    for (const [key, [convert]] of Object.entries(this.constructor.schema)) {
      const value = this[key];
      json[key] =
        value instanceof SchemaModel ? value.toJSON() : convert(value);
    }
    return json;
  }

  clone() {
    return new this.constructor(this.toJSON());
  }
}
