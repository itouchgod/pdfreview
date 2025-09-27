declare module 'pdfjs-dist/webpack' {
  export * from 'pdfjs-dist';
}

declare module 'pdfjs-dist/build/pdf.worker.entry' {
  const workerSrc: string;
  export default workerSrc;
}
