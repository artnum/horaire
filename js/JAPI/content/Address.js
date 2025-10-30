import SchemaModel from "../SchemaModel";

export default class Address extends SchemaModel {
  static schema = {
    type: [
      SchemaModel.toString,
      "STRUCTURED",
      (v) => v === "STRUCTURED" || v === "UNSTRUCTURED",
    ],
    id: [SchemaModel.toString, ""],
    name: [SchemaModel.toString, ""],
    str_or_line1: [SchemaModel.toString, ""],
    str_or_line2: [SchemaModel.toString, ""],
    postal_code: [SchemaModel.toString, ""],
    locality: [SchemaModel.toString, ""],
    country: [SchemaModel.toString, "", SchemaModel.isISO3166CountryCode],
    ext1: [SchemaModel.toString, ""],
    ext2: [SchemaModel.toString, ""],
    since: [SchemaModel.toDate, "0001-01-01"],
  };
}
