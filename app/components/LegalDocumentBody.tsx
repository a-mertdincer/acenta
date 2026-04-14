interface LegalDocumentBodyProps {
  text: string;
}

export function LegalDocumentBody({ text }: LegalDocumentBodyProps) {
  return (
    <div className="legal-document-body">
      <pre className="legal-document-pre">{text}</pre>
    </div>
  );
}
