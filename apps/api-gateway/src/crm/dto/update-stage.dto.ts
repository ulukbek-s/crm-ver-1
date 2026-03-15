import { IsString, IsIn } from 'class-validator';

const STAGES = [
  'leads',
  'candidates',
  'document_prep',
  'send_to_employer',
  'waiting_employer',
  'visa_prep',
  'visa_waiting',
  'accepted',
  'rejected',
];

export class UpdateStageDto {
  @IsString()
  @IsIn(STAGES)
  pipelineStage: string;
}
