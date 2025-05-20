/**
 * Type declarations for pdf-lib
 */
declare module 'pdf-lib' {
  export class PDFDocument {
    static create(): Promise<PDFDocument>;
    static load(bytes: Uint8Array | ArrayBuffer, options?: any): Promise<PDFDocument>;
    
    getForm(): PDFForm;
    getPages(): PDFPage[];
    embedPng(pngData: Uint8Array): Promise<PDFImage>;
    embedJpg(jpgData: Uint8Array): Promise<PDFImage>;
    save(): Promise<Uint8Array>;
    addPage(options?: any): PDFPage;
  }
  
  export class PDFForm {
    getFields(): PDFField[];
    getTextField(name: string): PDFTextField;
    getCheckBox(name: string): PDFCheckBox;
  }
  
  export class PDFPage {
    getHeight(): number;
    getWidth(): number;
    drawText(text: string, options?: any): void;
    drawImage(image: PDFImage, options?: any): void;
    drawLine(options?: any): void;
  }
  
  export interface PDFField {
    getName(): string;
    [key: string]: any;
  }
  
  export class PDFTextField implements PDFField {
    getName(): string;
    setText(text: string): void;
    [key: string]: any;
    acroField: any;
  }
  
  export class PDFCheckBox implements PDFField {
    getName(): string;
    check(): void;
    [key: string]: any;
    acroField: any;
  }
  
  export interface PDFImage {
    width: number;
    height: number;
    scale(factor: number): { width: number; height: number };
  }
} 