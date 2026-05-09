import { z } from 'zod';

export const BlueprintNodeSchema: z.ZodType<any> = z.lazy(() => z.object({
  id: z.string(),
  type: z.enum(['view', 'text', 'image', 'button', 'input', 'list']),
  name: z.string(),
  layout: z.record(z.any()).default({}),
  style: z.record(z.any()).default({}),
  children: z.array(BlueprintNodeSchema).optional(),
  content: z.string().optional(),
}));

export type BlueprintNode = z.infer<typeof BlueprintNodeSchema>;

export const UPGNodeTypeSchema = z.enum([
  'component',
  'element',
  'text',
  'style',
  'prop',
  'state',
  'file'
]);

export const ProjectMetadataSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  framework: z.string().default('nextjs-tailwind-typescript'),
  dependencies: z.record(z.string()).default({}),
  version: z.string().default('1.0.0'),
});

export const UPGNodeSchema = z.object({
  id: z.string(),
  type: UPGNodeTypeSchema,
  name: z.string().optional(),
  parent: z.string().optional(),
  children: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
});

export const UPGPropSchema = z.object({
  name: z.string(),
  type: z.string(),
  defaultValue: z.any().optional(),
  required: z.boolean(),
});

export const UPGStateSchema = z.object({
  name: z.string(),
  type: z.string(),
  defaultValue: z.any().optional(),
});

export const UPGImportSchema = z.object({
  module: z.string(),
  default: z.string().optional(),
  named: z.array(z.string()).optional(),
});

export const UPGComponentSchema = UPGNodeSchema.extend({
  type: z.literal('component'),
  name: z.string(),
  props: z.record(UPGPropSchema).default({}),
  state: z.record(UPGStateSchema).default({}),
  imports: z.array(UPGImportSchema).default([]),
});

export const UPGElementSchema = UPGNodeSchema.extend({
  type: z.literal('element'),
  tag: z.string(),
  props: z.record(z.any()).default({}),
  className: z.string().optional(),
});

export const UPGTextSchema = UPGNodeSchema.extend({
  type: z.literal('text'),
  content: z.string(),
});

export const UPGFileSchema = UPGNodeSchema.extend({
  type: z.literal('file'),
  path: z.string(),
  content: z.string(),
  language: z.string().default('typescript'),
});

export const UniversalProjectGraphSchema = z.object({
  id: z.string(),
  version: z.string().default('1.0.0'),
  project: ProjectMetadataSchema.optional(),
  file_tree: z.record(z.any()).default({}),
  rootComponentId: z.string().optional(),
  nodes: z.record(z.union([
    UPGComponentSchema,
    UPGElementSchema,
    UPGTextSchema,
    UPGFileSchema,
    UPGNodeSchema
  ])),
  scrape_method: z.enum(['deep', 'static']).optional(),
  fidelity_score: z.number().min(0).max(1).optional(),
});

export type UPGNodeType = z.infer<typeof UPGNodeTypeSchema>;
export type ProjectMetadata = z.infer<typeof ProjectMetadataSchema>;
export type UPGNode = z.infer<typeof UPGNodeSchema>;
export type UPGProp = z.infer<typeof UPGPropSchema>;
export type UPGState = z.infer<typeof UPGStateSchema>;
export type UPGImport = z.infer<typeof UPGImportSchema>;
export type UPGComponent = z.infer<typeof UPGComponentSchema>;
export type UPGElement = z.infer<typeof UPGElementSchema>;
export type UPGText = z.infer<typeof UPGTextSchema>;
export type UPGFile = z.infer<typeof UPGFileSchema>;
export type UniversalProjectGraph = z.infer<typeof UniversalProjectGraphSchema>;
