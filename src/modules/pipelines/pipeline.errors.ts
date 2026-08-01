import { AppError } from "@/shared/errors/app-error.js";

export class PipelineStageNotFoundError extends AppError {
  constructor() {
    super("Etapa do pipeline não encontrada", 404, "PIPELINE_STAGE_NOT_FOUND");
  }
}

export class PipelineStageHasLeadsError extends AppError {
  constructor() {
    super("Não é possível excluir uma etapa que possui leads", 409, "PIPELINE_STAGE_HAS_LEADS");
  }
}

export class CannotDeleteLastPipelineStageError extends AppError {
  constructor() {
    super(
      "Não é possível excluir a última etapa do pipeline",
      400,
      "CANNOT_DELETE_LAST_PIPELINE_STAGE",
    );
  }
}

export class InvalidPipelineStageOrderError extends AppError {
  constructor() {
    super(
      "A ordenação deve conter todas as etapas atuais da organização",
      400,
      "INVALID_PIPELINE_STAGE_ORDER",
    );
  }
}
