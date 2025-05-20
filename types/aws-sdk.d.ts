/**
 * Type declarations for AWS SDK S3 client
 */
declare module '@aws-sdk/client-s3' {
  export class S3Client {
    constructor(config: any);
    send(command: any): Promise<any>;
  }
  
  export class PutObjectCommand {
    constructor(params: PutObjectCommandInput);
  }
  
  export class GetObjectCommand {
    constructor(params: GetObjectCommandInput);
  }
  
  export class ListObjectsCommand {
    constructor(params: ListObjectsCommandInput);
  }
  
  export interface PutObjectCommandInput {
    Bucket: string;
    Key: string;
    Body: any;
    ContentType?: string;
    Metadata?: Record<string, string>;
    [key: string]: any;
  }
  
  export interface GetObjectCommandInput {
    Bucket: string;
    Key: string;
    [key: string]: any;
  }
  
  export interface ListObjectsCommandInput {
    Bucket: string;
    Prefix?: string;
    MaxKeys?: number;
    [key: string]: any;
  }
} 