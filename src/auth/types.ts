import { Strategy } from 'passport';
import { DeepRequired } from 'ts-essentials';
import { PayloadRequest } from '../express/types';
import { Where, PayloadMongooseDocument } from '../types';

export type Permission = {
  permission: boolean
  where?: Record<string, unknown>
}

export type FieldPermissions = {
  create: {
    permission: boolean
  }
  read: {
    permission: boolean
  }
  update: {
    permission: boolean
  }
  fields?: {
    [field: string]: FieldPermissions
  }
}

export type CollectionPermission = {
  create: Permission
  read: Permission
  update: Permission
  delete: Permission
  fields: {
    [field: string]: FieldPermissions
  }
}

export type GlobalPermission = {
  read: Permission
  update: Permission
  fields: {
    [field: string]: FieldPermissions
  }
}

export type Permissions = {
  canAccessAdmin: boolean
  collections: CollectionPermission[]
  globals?: GlobalPermission[]
}

export type User = {
  id: string
  email: string
  collection: string
  [key: string]: unknown
}

export interface UserDocument extends PayloadMongooseDocument {
  setPassword: (pass: string) => Promise<void>
  authenticate: (pass: string) => Promise<void>
  resetPasswordExpiration: number
  email: string
}

type GenerateVerifyEmailHTML = (args: { req: PayloadRequest, token: string, user: any}) => Promise<string> | string
type GenerateVerifyEmailSubject = (args: { req: PayloadRequest, token: string, user: any}) => Promise<string> | string

type GenerateForgotPasswordEmailHTML = (args?: { req?: PayloadRequest, token?: string, user?: unknown}) => Promise<string> | string
type GenerateForgotPasswordEmailSubject = (args?: { req?: PayloadRequest, token?: string, user?: any }) => Promise<string> | string

export interface IncomingAuthType {
  tokenExpiration?: number;
  verify?:
  | boolean
  | {
    generateEmailHTML?: GenerateVerifyEmailHTML;
    generateEmailSubject?: GenerateVerifyEmailSubject;
  };
  maxLoginAttempts?: number;
  lockTime?: number;
  useAPIKey?: boolean;
  depth?: number
  cookies?: {
    secure?: boolean;
    sameSite?: boolean | 'none' | 'strict' | 'lax';
    domain?: string;
  }
  forgotPassword?: {
    generateEmailHTML?: GenerateForgotPasswordEmailHTML,
    generateEmailSubject?: GenerateForgotPasswordEmailSubject,
  }
  disableLocalStrategy?: true
  strategies?: {
    strategy: Strategy
    refresh?: boolean
    logout?: boolean
  }[]
}

export type VerifyConfig = {
  generateEmailHTML?: GenerateVerifyEmailHTML
  generateEmailSubject?: GenerateVerifyEmailSubject
};

export interface Auth extends Omit<DeepRequired<IncomingAuthType>, 'verify' | 'forgotPassword'> {
  verify?: VerifyConfig | boolean
  forgotPassword?: {
    generateEmailHTML?: GenerateForgotPasswordEmailHTML
    generateEmailSubject?: GenerateForgotPasswordEmailSubject
  }
}

export function hasWhereAccessResult(result: boolean | Where): result is Where {
  return result && typeof result === 'object';
}
