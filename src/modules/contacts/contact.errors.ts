import { AppError } from "@/shared/errors/app-error.js";

export class ContactNotFoundError extends AppError {
  constructor() {
    super("Contact not found", 404, "CONTACT_NOT_FOUND");
  }
}

export class ContactPhoneAlreadyInUseError extends AppError {
  constructor() {
    super("Phone number is already in use", 409, "CONTACT_PHONE_ALREADY_IN_USE");
  }
}

export class ContactHasRelationsError extends AppError {
  constructor() {
    super(
      "Contact cannot be deleted while it has leads or conversations",
      409,
      "CONTACT_HAS_RELATIONS",
    );
  }
}
