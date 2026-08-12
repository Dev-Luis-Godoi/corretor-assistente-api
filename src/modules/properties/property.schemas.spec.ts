import { describe, expect, it } from "vitest";

import {
  createPropertySchema,
  preparePropertyPhotoSchema,
  updatePropertySchema,
} from "./property.schemas.js";

const validProperty = {
  title: "Apartamento no Centro",
  type: "APARTMENT",
  purpose: "SALE",
  price: 650000,
  city: "Campinas",
  state: "sp",
};

describe("property schemas", () => {
  it("normalizes the state and applies safe defaults", () => {
    const result = createPropertySchema.parse(validProperty);

    expect(result.state).toBe("SP");
    expect(result.status).toBe("AVAILABLE");
    expect(result.amenities).toEqual([]);
    expect(result.bedrooms).toBe(0);
  });

  it("rejects invalid commercial values and zip codes", () => {
    const result = createPropertySchema.safeParse({
      ...validProperty,
      price: -1,
      zipCode: "13000-000",
    });

    expect(result.success).toBe(false);
  });

  it("requires at least one field when updating", () => {
    expect(updatePropertySchema.safeParse({}).success).toBe(false);
    expect(updatePropertySchema.safeParse({ featured: true }).success).toBe(true);
  });

  it("limits photo uploads to supported formats and six megabytes", () => {
    expect(
      preparePropertyPhotoSchema.safeParse({
        fileName: "fachada.webp",
        mimeType: "image/webp",
        sizeBytes: 1024,
      }).success,
    ).toBe(true);
    expect(
      preparePropertyPhotoSchema.safeParse({
        fileName: "fachada.gif",
        mimeType: "image/gif",
        sizeBytes: 7 * 1024 * 1024,
      }).success,
    ).toBe(false);
  });
});
