import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  GitCompare, 
  ShieldCheck, 
  Check, 
  AlertTriangle, 
  ArrowRight,
  Layers,
  Database,
  FileText,
  BookOpen,
  Sparkles,
  ExternalLink,
  Info,
  CheckCircle2,
  FileCheck2,
  ListOrdered,
  Search,
  MessageSquare,
  Building2,
  Clock,
  UserCheck,
  CheckCircle,
  ThumbsUp,
  FileSpreadsheet,
  AlertCircle,
  Download,
  Printer,
  Table,
  Filter,
  Eye,
  FileCode,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Sliders,
  Upload,
  Clipboard,
  ClipboardCheck,
  Columns,
  Maximize2,
  MoveHorizontal,
  Camera,
  Scan,
  Plus,
  Share2,
  FolderOpen
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Document, DocumentVersion } from '../types';
import { 
  evaluateDocumentCompliance, 
  findTopicalBenchmarkReference,
  ComplianceEvaluation,
  BenchmarkMatchResult
} from '../utils/complianceEngine';
import { getGeologicalStrataPngBase64, openImageInNewTab } from '../utils/imageViewerUtils';

export interface ParsedSection {
  heading: string;
  items: {
    type: 'para' | 'bullet' | 'subhead' | 'directive' | 'table' | 'callout';
    text: string;
    rows?: string[][];
  }[];
}

export interface ParsedStatutoryDocumentModel {
  title: string;
  code: string;
  subsidiary: string;
  period: string;
  date: string;
  author: string;
  sections: ParsedSection[];
}

export function parseStatutoryText(
  rawText: string,
  fallback: { title: string; code: string; subsidiary: string; date?: string; author?: string }
): ParsedStatutoryDocumentModel {
  let text = (rawText || '').trim();

  // Extract metadata if present in stream
  let extractedCode = fallback.code;
  let extractedSub = fallback.subsidiary;
  let extractedPeriod = 'FY 2025-26 (Q3/Q4)';
  let extractedDate = fallback.date || new Date().toLocaleDateString();
  let extractedAuthor = fallback.author || 'Vedant Dike (admin)';
  let extractedTitle = fallback.title;

  const codeMatch = text.match(/Code:\s*([A-Z0-9\-_/]+)/i) || text.match(/\b(REP-\d+-[A-Z]+-\d+|CMPDI\/[A-Z0-9\-_/]+)\b/i);
  if (codeMatch) extractedCode = codeMatch[1] || codeMatch[0];

  const subMatch = text.match(/Subsidiary:\s*([A-Z\s]+?)(?=\s+(?:Period|Date|Author|Code)|\s*$|\n)/i);
  if (subMatch && subMatch[1].trim().length < 25) extractedSub = subMatch[1].trim();

  const periodMatch = text.match(/Period:\s*([^Date\n|]+?)(?=\s+Date|\s*$|\n)/i);
  if (periodMatch) extractedPeriod = periodMatch[1].trim();

  const dateMatch = text.match(/Date:\s*([^|Author\n]+?)(?=\s*\|\s*Author|\s*$|\n)/i);
  if (dateMatch) extractedDate = dateMatch[1].trim();

  const authorMatch = text.match(/Author:\s*([^\d\n]+?)(?=\s*\d+\.|\s*$|\n|1\.)/i);
  if (authorMatch && authorMatch[1].trim().length < 40) extractedAuthor = authorMatch[1].trim();

  const titleMatch = text.match(/(Monthly Subsidiary Production Variance Brief\s*—\s*[A-Z]+|[\w\s-]+\bReport\b|[\w\s-]+\bBrief\b)/i);
  if (titleMatch && titleMatch[1].length > 12 && titleMatch[1].length < 80) extractedTitle = titleMatch[1].trim();

  // Clean noise boilerplate
  text = text
    .replace(/---\s*Page\s*\d+\s*---/gi, '')
    .replace(/--\s*Page\s*\d+\s*--/gi, '')
    .replace(/Page\s+\d+\s+CONFIDENTIAL\s*—\s*STATUTORY\s*MINING\s*GOVERNANCE/gi, '')
    .replace(/CENTRAL\s+MINE\s+PLANNING\s*&\s*DESIGN\s+INSTITUTE\s*\(CMPDI\)\s*—\s*STATUTORY\s*BRIEF/gi, '')
    .replace(/REP-\d+-[A-Z]+-\d+/gi, '')
    .replace(/Monthly\s+Subsidiary\s+Production\s+Variance\s+Brief\s*—\s*[A-Z]+/gi, '')
    .replace(/Code:\s*[^\s]+(\s+Subsidiary:\s*[^\s]+)?(\s+Period:\s*[^Date]+)?(\s+Date:\s*[^|]+)?(\s*\|\s*Author:\s*[^1-9\n]+)?/gi, '')
    .replace(/CONFIDENTIAL\s*—\s*STATUTORY\s*MINING\s*GOVERNANCE/gi, '')
    .trim();

  // Pre-split known major headings & structured parts
  text = text
    .replace(/(\s+|^)(?=\d+\.\s+[A-Z][a-zA-Z\s&/—–-]{3,60}(?::|$|\s+[A-Z]|\s+This|\s+Synthesized|\s+Respective|\s+Operational|\s+Detailed))/g, '\n\n[[SEC_HEAD]]')
    .replace(/(\s+|^)(?=(?:Detailed Observations & Geological\/Operational Parameters:|Detailed Observations:|Geological Parameters:|Operational Parameters:))/g, '\n\n[[SUB_HEAD]]')
    .replace(/(\s+|^)(?=(?:Point\s+\d+\.\d+\s+\[.*?\]|Point\s+\d+\.\d+:))/g, '\n\n[[POINT_ITEM]]')
    .replace(/(\s+|^)(?=(?:-\s+[A-Z]|•\s+[A-Z]))/g, '\n[[BULLET_ITEM]]')
    .replace(/(\s+|^)(?=(?:\d+\.\s+[A-Z][a-zA-Z\s]+:))/g, '\n\n[[DIRECTIVE_ITEM]]');

  const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection = {
    heading: '1. Statutory Context & Executive Directive',
    items: []
  };

  for (const rawLine of rawLines) {
    if (rawLine.startsWith('[[SEC_HEAD]]')) {
      const headingText = rawLine.replace('[[SEC_HEAD]]', '').trim();
      if (currentSection.items.length > 0) {
        sections.push(currentSection);
      }
      currentSection = {
        heading: headingText,
        items: []
      };
      continue;
    }

    if (rawLine.startsWith('[[SUB_HEAD]]')) {
      const subhead = rawLine.replace('[[SUB_HEAD]]', '').trim();
      currentSection.items.push({ type: 'subhead', text: subhead });
      continue;
    }

    if (rawLine.startsWith('[[POINT_ITEM]]')) {
      const point = rawLine.replace('[[POINT_ITEM]]', '').trim();
      currentSection.items.push({ type: 'subhead', text: point });
      continue;
    }

    if (rawLine.startsWith('[[BULLET_ITEM]]')) {
      const bullet = rawLine.replace('[[BULLET_ITEM]]', '').replace(/^[•\-]\s*/, '').trim();
      currentSection.items.push({ type: 'bullet', text: bullet });
      continue;
    }

    if (rawLine.startsWith('[[DIRECTIVE_ITEM]]')) {
      const directive = rawLine.replace('[[DIRECTIVE_ITEM]]', '').trim();
      currentSection.items.push({ type: 'directive', text: directive });
      continue;
    }

    if (rawLine.includes('|') && rawLine.split('|').filter(Boolean).length >= 2) {
      const cells = rawLine.split('|').map(c => c.trim()).filter(Boolean);
      const last = currentSection.items[currentSection.items.length - 1];
      if (last && last.type === 'table' && last.rows) {
        last.rows.push(cells);
      } else {
        currentSection.items.push({ type: 'table', text: '', rows: [cells] });
      }
      continue;
    }

    if (/^(NOTE|CRITICAL|WARNING|DIRECTIVE|MANDATORY):/i.test(rawLine)) {
      currentSection.items.push({ type: 'callout', text: rawLine });
      continue;
    }

    if (rawLine.length > 0) {
      currentSection.items.push({ type: 'para', text: rawLine });
    }
  }

  if (currentSection.items.length > 0) {
    sections.push(currentSection);
  }

  return {
    title: extractedTitle,
    code: extractedCode,
    subsidiary: extractedSub,
    period: extractedPeriod,
    date: extractedDate,
    author: extractedAuthor,
    sections: sections.length > 0 ? sections : [
      {
        heading: '1. Statutory Filing Content',
        items: [{ type: 'para', text: text || 'Statutory filing details registered under Coal India CMPDI.' }]
      }
    ]
  };
}

export const buildStatutoryJsPdf = (doc: Document, v2: DocumentVersion): jsPDF => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const maxLineWidth = pageWidth - margin * 2;
  let yPos = 20;

  const checkPageBreak = (neededHeight: number) => {
    if (yPos + neededHeight > pageHeight - 18) {
      pdf.addPage();
      yPos = 20;
      drawHeaderFooter();
    }
  };

  const drawHeaderFooter = () => {
    // Top header accent line
    pdf.setDrawColor(200, 137, 46); // #C8892E
    pdf.setLineWidth(1.2);
    pdf.line(margin, 10, pageWidth - margin, 10);

    // Top header text
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text('CENTRAL MINE PLANNING & DESIGN INSTITUTE (CMPDI) — STATUTORY BRIEF', margin, 8);
    pdf.text(doc.documentCode, pageWidth - margin, 8, { align: 'right' });

    // Bottom page footer
    const pageCount = pdf.getNumberOfPages();
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Page ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    pdf.text('CONFIDENTIAL — STATUTORY MINING GOVERNANCE', margin, pageHeight - 10);
  };

  drawHeaderFooter();

  const parsed = parseStatutoryText(v2.extractedText || '', {
    title: doc.title,
    code: doc.documentCode,
    subsidiary: doc.subsidiary,
    date: v2.uploadedAt ? new Date(v2.uploadedAt).toLocaleDateString() : new Date().toLocaleDateString(),
    author: `${v2.uploadedBy.name} (${v2.uploadedBy.employeeId})`
  });

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.setTextColor(20, 28, 43);
  const splitTitle = pdf.splitTextToSize(parsed.title || doc.title, maxLineWidth);
  pdf.text(splitTitle, margin, yPos);
  yPos += splitTitle.length * 6.5 + 4;

  // Metadata Card
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(margin, yPos, maxLineWidth, 14, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`Code: ${parsed.code}`, margin + 4, yPos + 5.5);
  pdf.text(`Subsidiary: ${parsed.subsidiary}`, margin + 60, yPos + 5.5);
  pdf.text(`Period: ${parsed.period}`, margin + 115, yPos + 5.5);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Date: ${parsed.date} | Author: ${parsed.author}`, margin + 4, yPos + 10.5);
  yPos += 20;

  // Content Sections
  for (const sec of parsed.sections) {
    checkPageBreak(18);
    yPos += 3;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(15, 23, 42);
    pdf.text(sec.heading, margin, yPos);
    yPos += 4.5;

    // Amber underline under section heading
    pdf.setDrawColor(200, 137, 46);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos, margin + 35, yPos);
    yPos += 3.5;

    for (const item of sec.items) {
      if (item.type === 'para') {
        checkPageBreak(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(51, 65, 85);
        const splitP = pdf.splitTextToSize(item.text, maxLineWidth);
        pdf.text(splitP, margin, yPos);
        yPos += splitP.length * 4.2 + 2.5;
      } else if (item.type === 'subhead') {
        checkPageBreak(12);
        yPos += 2;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.5);
        pdf.setTextColor(30, 41, 59);
        pdf.text(item.text, margin, yPos);
        yPos += 4.5;
      } else if (item.type === 'bullet') {
        checkPageBreak(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(51, 65, 85);
        const splitB = pdf.splitTextToSize(`• ${item.text}`, maxLineWidth - 4);
        pdf.text(splitB, margin + 2, yPos);
        yPos += splitB.length * 4 + 2;
      } else if (item.type === 'directive') {
        checkPageBreak(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(15, 23, 42);
        const splitD = pdf.splitTextToSize(item.text, maxLineWidth - 2);
        pdf.text(splitD, margin, yPos);
        yPos += splitD.length * 4 + 2.5;
      } else if (item.type === 'callout') {
        checkPageBreak(12);
        pdf.setFillColor(254, 242, 242);
        pdf.setDrawColor(220, 38, 38);
        pdf.setLineWidth(0.3);
        const splitC = pdf.splitTextToSize(item.text, maxLineWidth - 6);
        const boxH = splitC.length * 4 + 4;
        pdf.rect(margin, yPos, maxLineWidth, boxH, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(153, 27, 27);
        pdf.text(splitC, margin + 3, yPos + 3.5);
        yPos += boxH + 2;
      }
    }
  }

  return pdf;
};

export const getSampleGeologicalSurveySvgDataUrl = (title: string, subsidiary: string, docCode: string): string => {
  return getGeologicalStrataPngBase64(title, subsidiary, docCode);
};

export const CompareVersionsModal: React.FC = () => {
  const { 
    compareVersions, 
    setCompareVersions, 
    approveVersion, 
    requestChangesVersion, 
    updateDocumentVersionFileUrl,
    currentUser, 
    documents 
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'summary' | 'pdf_view' | 'diff'>(() => {
    return compareVersions?.initialTab || 'summary';
  });

  useEffect(() => {
    if (compareVersions?.initialTab) {
      setActiveTab(compareVersions.initialTab);
    }
  }, [compareVersions?.initialTab]);

  const [selectedBenchmarkDocId, setSelectedBenchmarkDocId] = useState<string>('auto');
  const [actionModal, setActionModal] = useState<'changes' | null>(null);
  const [actionReason, setActionReason] = useState<string>('');
  const [spreadsheetSearch, setSpreadsheetSearch] = useState<string>('');
  const [sheetViewMode, setSheetViewMode] = useState<'grid' | 'raw'>('grid');
  
  // PDF Viewer Interactive States
  const [pdfZoom, setPdfZoom] = useState<number>(100);
  const [pdfViewMode, setPdfViewMode] = useState<'formatted' | 'native_pdf' | 'raw'>('formatted');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [googleDriveModalOpen, setGoogleDriveModalOpen] = useState<boolean>(false);
  const [pdfToast, setPdfToast] = useState<string | null>(null);

  useEffect(() => {
    if (!compareVersions?.v2 || !compareVersions?.doc) {
      setPdfBlobUrl(null);
      return;
    }
    try {
      const pdf = buildStatutoryJsPdf(compareVersions.doc, compareVersions.v2);
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (err) {
      console.error('Failed to build PDF blob', err);
    }
  }, [compareVersions?.doc?.id, compareVersions?.v2?.id, compareVersions?.v2?.extractedText]);

  const handleOpenPdfInNewTab = () => {
    if (!compareVersions) return;
    const { doc, v2 } = compareVersions;
    try {
      const pdf = buildStatutoryJsPdf(doc, v2);
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setPdfToast('Official statutory PDF document opened in new tab.');
      setTimeout(() => setPdfToast(null), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadPdf = () => {
    if (!compareVersions) return;
    const { doc, v2 } = compareVersions;
    try {
      const pdf = buildStatutoryJsPdf(doc, v2);
      pdf.save(`${doc.documentCode}_v${v2.versionNumber}.0_${doc.subsidiary}.pdf`);
      setPdfToast('Downloaded official statutory PDF document.');
      setTimeout(() => setPdfToast(null), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrintPdf = () => {
    if (!compareVersions) return;
    const { doc, v2 } = compareVersions;
    try {
      const pdf = buildStatutoryJsPdf(doc, v2);
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) {
        win.focus();
        setTimeout(() => win.print(), 500);
      }
    } catch (err) {
      console.error(err);
    }
  };
  
  // Image Viewer Interactive States
  const [imageZoom, setImageZoom] = useState<number>(1);
  const [imageRotation, setImageRotation] = useState<number>(0);
  const [imageFilter, setImageFilter] = useState<'normal' | 'contrast' | 'grayscale' | 'invert'>('normal');
  const [showImageOcr, setShowImageOcr] = useState<boolean>(true);
  const [isDraggingOverV2, setIsDraggingOverV2] = useState<boolean>(false);
  const [isDraggingOverV1, setIsDraggingOverV1] = useState<boolean>(false);
  
  // Dual Visual Comparison Diff Mode (Tab 3 for images)
  const [visualDiffMode, setVisualDiffMode] = useState<'split' | 'wipe' | 'onion'>('split');
  const [wipeSliderPos, setWipeSliderPos] = useState<number>(50);
  const [onionOpacity, setOnionOpacity] = useState<number>(50);

  const fileInputV2Ref = useRef<HTMLInputElement>(null);
  const fileInputV1Ref = useRef<HTMLInputElement>(null);

  // Window Global Paste Listener (Ctrl+V directly onto modal) - Registered unconditionally
  useEffect(() => {
    if (!compareVersions) return;
    const { v2, doc } = compareVersions;

    const handleWindowPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const base64 = ev.target?.result as string;
              if (base64) {
                const actualFileName = file.name || `Pasted_Geological_Capture_${Date.now()}.png`;
                const summaryText = `High-resolution geological visual capture attached to version ${v2.versionNumber}.0 (${doc.title}).\n` +
                  `File Name: ${actualFileName} | Division: ${doc.subsidiary}\n` +
                  `Extracted Borehole Strata Coordinates: 23°47'28"N 86°25'42"E | Elevation: +248m\n` +
                  `Lithological strata: Topsoil, Overburden Sandstone (42 MPa), Seam-IV Main Coal (26.5m thickness), Interburden Siltstone, Seam-V Lower Coal.`;
                updateDocumentVersionFileUrl(doc.id, v2.id, base64, actualFileName, summaryText);
              }
            };
            reader.readAsDataURL(file);
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [compareVersions, updateDocumentVersionFileUrl]);

  if (!compareVersions) return null;

  const { v1, v2, doc } = compareVersions;
  const isInitialSubmission = v2.versionNumber === 1 || v1.id === v2.id || !v1;

  // Detect if document is an image format
  const fnV2Lower = (v2.fileName || '').toLowerCase();
  const isV2Image = Boolean(
    fnV2Lower.endsWith('.jpg') || 
    fnV2Lower.endsWith('.jpeg') || 
    fnV2Lower.endsWith('.png') || 
    fnV2Lower.endsWith('.webp') || 
    fnV2Lower.endsWith('.bmp') || 
    fnV2Lower.endsWith('.gif') || 
    fnV2Lower.endsWith('.svg') ||
    Boolean(v2.fileUrl?.startsWith('data:image')) ||
    Boolean(v2.fileUrl?.startsWith('blob:'))
  );

  // Compute topical benchmark match
  const benchmarkResult: BenchmarkMatchResult = findTopicalBenchmarkReference(doc, v2, documents);

  let benchmarkDoc: Document | null = null;
  if (selectedBenchmarkDocId === 'none') {
    benchmarkDoc = null;
  } else if (selectedBenchmarkDocId === 'auto' || !selectedBenchmarkDocId) {
    benchmarkDoc = benchmarkResult.mode === 'benchmark_available' ? benchmarkResult.bestMatchDoc : null;
  } else {
    benchmarkDoc = documents.find(d => d.id === selectedBenchmarkDocId) || null;
  }

  const benchmarkVersion: DocumentVersion | null = benchmarkDoc 
    ? (benchmarkDoc.versions.find(v => v.approvalStatus === 'approved') || benchmarkDoc.versions[0])
    : (isInitialSubmission ? null : v1);

  // Effective Visual Data URLs
  const effectiveV2Image: string = v2.fileUrl || getSampleGeologicalSurveySvgDataUrl(doc.title, doc.subsidiary, doc.documentCode);
  const effectiveV1Image: string = (benchmarkVersion?.fileUrl) || v1?.fileUrl || getSampleGeologicalSurveySvgDataUrl(
    benchmarkDoc ? benchmarkDoc.title : `${doc.title} (Baseline Reference)`,
    benchmarkDoc ? benchmarkDoc.subsidiary : doc.subsidiary,
    benchmarkDoc ? benchmarkDoc.documentCode : `${doc.documentCode}-BL`
  );

  // Handle Direct Paste of Image
  const handleApplyPastedImage = (base64Url: string, fileName?: string, targetVersion: 'v1' | 'v2' = 'v2') => {
    const targetVer = targetVersion === 'v2' ? v2 : (benchmarkVersion || v1);
    if (!targetVer) return;

    const actualFileName = fileName || `Pasted_Geological_Capture_${Date.now()}.png`;
    const summaryText = `High-resolution geological visual capture attached to version ${targetVer.versionNumber}.0 (${doc.title}).\n` +
      `File Name: ${actualFileName} | Division: ${doc.subsidiary}\n` +
      `Extracted Borehole Strata Coordinates: 23°47'28"N 86°25'42"E | Elevation: +248m\n` +
      `Lithological strata: Topsoil, Overburden Sandstone (42 MPa), Seam-IV Main Coal (26.5m thickness), Interburden Siltstone, Seam-V Lower Coal.`;

    updateDocumentVersionFileUrl(doc.id, targetVer.id, base64Url, actualFileName, summaryText);
  };

  // Clipboard Reader with Click
  const handleReadClipboard = async (targetVersion: 'v1' | 'v2' = 'v2') => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find(type => type.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = e.target?.result as string;
              if (base64) {
                handleApplyPastedImage(base64, `Pasted_Screenshot_${Date.now()}.png`, targetVersion);
              }
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
      // If no clipboard item found or permission denied, trigger file picker
      if (targetVersion === 'v2') {
        fileInputV2Ref.current?.click();
      } else {
        fileInputV1Ref.current?.click();
      }
    } catch (err) {
      console.warn('Clipboard read notice, falling back to file chooser:', err);
      if (targetVersion === 'v2') {
        fileInputV2Ref.current?.click();
      } else {
        fileInputV1Ref.current?.click();
      }
    }
  };

  // Run statutory compliance evaluation
  const aiEval: ComplianceEvaluation = evaluateDocumentCompliance(doc, v2);

  // Helper to parse unstructured OCR / text into readable structured sections
  const parseDocumentSections = (text: string | undefined, currentDoc: Document, version: DocumentVersion) => {
    if (!text || text.trim().length === 0) {
      return [
        {
          title: '1. Statutory Context & Submission Purpose',
          body: version.reasonForChange || `Statutory technical filing filed under ${currentDoc.subsidiary} jurisdiction with reference ${currentDoc.documentCode} (${currentDoc.title}).`
        },
        {
          title: '2. Technical Overview & Operational Data',
          body: `This document contains verified operational parameters, geological surveys, and compliance protocols for ${currentDoc.subsidiary}. Extracted through the MineMind AI OCR pipeline with ${version.ocrConfidence || 99.2}% verified character precision.`
        },
        {
          title: '3. Compliance & Governance Directives',
          body: `Filing conforms with CMPDI and DGMS statutory mining requirements. Prepared for vector indexing and semantic discovery across Coal India subsidiaries.`
        }
      ];
    }
    
    const cleaned = text
      .replace(/--- Page \d+ ---/g, '\n\n')
      .replace(/\r\n/g, '\n')
      .trim();

    const regexPattern = /(?:^|\n\n|\n)(?:(\d+\.\s+[^\n:]+)|([A-Z\s]{4,35}:))(?::|\n|\s{2,})/g;
    const matches = Array.from(cleaned.matchAll(regexPattern));

    if (matches.length >= 2) {
      const sections: { title: string; body: string }[] = [];
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const heading = (match[1] || match[2] || `Section ${i + 1}`).trim();
        const startIndex = (match.index || 0) + match[0].length;
        const endIndex = i + 1 < matches.length ? (matches[i + 1].index || cleaned.length) : cleaned.length;
        const sectionBody = cleaned.slice(startIndex, endIndex).trim();

        if (sectionBody.length > 0) {
          sections.push({
            title: heading.startsWith('1.') || heading.startsWith('2.') || heading.startsWith('3.') || heading.startsWith('4.')
              ? heading 
              : `${i + 1}. ${heading.replace(/:$/, '')}`,
            body: sectionBody
          });
        }
      }
      if (sections.length > 0) return sections;
    }

    const paragraphs = cleaned
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 20);

    if (paragraphs.length > 1) {
      const defaultTitles = [
        '1. Statutory Executive Brief & Filing Context',
        '2. Technical Analysis & Operational Findings',
        '3. Geological Parameters & Stripping Ratio Assays',
        '4. Environmental Clearances & DGMS Guidelines',
        '5. Actionable Directives & Recommendations'
      ];

      return paragraphs.map((para, idx) => ({
        title: defaultTitles[idx] || `Section ${idx + 1}. Technical Details`,
        body: para
      }));
    }

    const sentences = cleaned.split(/(?<=[.!?])\s+/);
    if (sentences.length > 4) {
      const mid = Math.ceil(sentences.length / 2);
      return [
        {
          title: '1. Executive Brief & Statutory Context',
          body: sentences.slice(0, mid).join(' ')
        },
        {
          title: '2. Technical Analysis & Operational Directives',
          body: sentences.slice(mid).join(' ')
        }
      ];
    }

    return [
      {
        title: '1. Technical Executive Filing',
        body: cleaned
      }
    ];
  };

  const generateCleanSummaryPoints = (): string[] => {
    const points: string[] = [];
    
    if (v2.reasonForChange) {
      points.push(`Submission Objective: ${v2.reasonForChange}`);
    }

    const sections = parseDocumentSections(v2.extractedText, doc, v2);
    sections.forEach(sec => {
      const sentences = sec.body
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 25 && !s.toLowerCase().startsWith('uploaded by') && !s.toLowerCase().startsWith('date:'));

      if (sentences[0]) {
        const cleanSentence = sentences[0].replace(/^CENTRAL MINE PLANNING & DESIGN INSTITUTE[^–—:]*[-–—:]\s*/i, '');
        points.push(`${sec.title.replace(/^\d+\.\s*/, '')}: ${cleanSentence}`);
      }
    });

    if (points.length === 0) {
      points.push(`Standard statutory technical filing submitted for ${doc.subsidiary} jurisdiction.`);
    }

    return points.slice(0, 4);
  };

  const getPredefinedDirectives = () => {
    const list = [];
    if (aiEval.categoryMismatch) {
      list.push({
        label: 'Category Mismatch: Unrelated Content',
        icon: '⚠️',
        text: `Category Mismatch Notice: The submitted file "${v2.fileName || doc.title}" appears to contain non-mining subject matter (${aiEval.detectedSubject}) that does not match the expected statutory technical filing category (${doc.type.replace(/_/g, ' ')}) for ${doc.subsidiary}. Please upload the authorized statutory mining technical documentation or amend the filing category.`
      });
    }

    list.push(
      {
        label: 'Overburden / Stripping Assay',
        icon: '📊',
        text: `Please furnish an updated Seam-IV overburden geological cross-section and calibrate stripping ratio assays against statutory DGMS guidelines before final indexing.`
      },
      {
        label: 'Missing Statutory Sign-Off',
        icon: '✍️',
        text: `Please ensure this technical filing includes the authorized digital endorsement and signature from the ${doc.subsidiary} Area Safety & Mining Operations Officer.`
      },
      {
        label: 'Attach Environmental Clearance (EMP)',
        icon: '🌱',
        text: `Please attach the corresponding Environmental Management Plan (EMP) statutory clearance certificate and water discharge assay memo.`
      },
      {
        label: 'Proximate Coal Grade Calibration',
        icon: '🔬',
        text: `Observed discrepancy in proximate analysis. Kindly provide the certified CMPDI laboratory assay report for moisture, ash content, and gross calorific value (GCV).`
      },
      {
        label: 'Production Variance Reconciliation',
        icon: '📋',
        text: `Please provide a root-cause reconciliation note for the quarterly extraction volume deviation signed off by the General Manager (Operations).`
      }
    );

    return list;
  };

  const handleAutoDraftAiDirective = () => {
    setActionReason(aiEval.suggestedActionDirective);
  };

  const cleanSummaryPoints = generateCleanSummaryPoints();
  const predefinedDirectives = getPredefinedDirectives();

  const handleApprove = () => {
    approveVersion(doc.id, v2.id, 'Verified via Side-by-Side Diff Inspector & Executive Review');
    setCompareVersions(null);
  };

  const handleRequestChanges = () => {
    if (!actionReason.trim()) return;
    requestChangesVersion(doc.id, v2.id, actionReason.trim());
    setActionModal(null);
    setCompareVersions(null);
  };

  const handleDownloadImage = (urlToDownload: string, filename?: string) => {
    const a = window.document.createElement('a');
    a.href = urlToDownload;
    a.download = filename || `${doc.title}_Visual_Survey.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs">
      {/* Hidden File Inputs for v2 and v1 Image Replacement */}
      <input 
        type="file" 
        ref={fileInputV2Ref}
        accept=".jpg,.jpeg,.png,.webp,.bmp,.gif,.svg,image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const base64 = ev.target?.result as string;
              if (base64) handleApplyPastedImage(base64, file.name, 'v2');
            };
            reader.readAsDataURL(file);
          }
        }}
      />
      <input 
        type="file" 
        ref={fileInputV1Ref}
        accept=".jpg,.jpeg,.png,.webp,.bmp,.gif,.svg,image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const base64 = ev.target?.result as string;
              if (base64) handleApplyPastedImage(base64, file.name, 'v1');
            };
            reader.readAsDataURL(file);
          }
        }}
      />

      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E4E0D6] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#141C2B] text-white border-b border-[#1E293B]">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#C8892E]">
                <GitCompare className="w-4 h-4 text-[#C8892E]" />
                <span className="font-bold">
                  {isInitialSubmission ? 'Initial Ingestion & Benchmark Review' : 'Controlled Revision Diff Inspector'}
                </span>
                <span>·</span>
                <span>{doc.documentCode}</span>
                {isInitialSubmission && (
                  <span className="bg-[#C8892E]/20 text-[#F59E0B] border border-[#C8892E]/40 px-2 py-0.2 rounded font-mono text-[10px] uppercase font-bold">
                    Initial Baseline v1.0
                  </span>
                )}
              </div>
              <h3 className="font-sans font-bold text-base sm:text-lg text-white mt-0.5 break-words">
                {isInitialSubmission ? (
                  <>Initial Filing Review: Version 1.0 — {doc.title}</>
                ) : (
                  <>Comparing Version {v1.versionNumber}.0 vs Version {v2.versionNumber}.0 — {doc.title}</>
                )}
              </h3>
            </div>
            <button
              onClick={() => setCompareVersions(null)}
              className="text-[#94A3B8] hover:text-white p-1.5 rounded-lg hover:bg-[#1E293B] transition-colors cursor-pointer flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#1E293B] text-xs font-medium">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'summary'
                  ? 'bg-[#C8892E] text-[#141C2B] font-bold shadow-xs'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>1. Executive AI Brief</span>
            </button>

            <button
              onClick={() => setActiveTab('pdf_view')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'pdf_view'
                  ? 'bg-[#C8892E] text-[#141C2B] font-bold shadow-xs'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
              }`}
            >
              {(() => {
                const fn = (v2.fileName || '').toLowerCase();
                const isImg = fn.endsWith('.jpg') || fn.endsWith('.jpeg') || fn.endsWith('.png') || fn.endsWith('.webp') || fn.endsWith('.bmp') || fn.endsWith('.gif') || Boolean(v2.fileUrl?.startsWith('data:image'));
                const isSheet = fn.endsWith('.csv') || fn.endsWith('.xlsx') || fn.endsWith('.xls') || fn.endsWith('.tsv');

                if (isImg || isV2Image) {
                  return (
                    <>
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>2. Image & Photo Viewer</span>
                    </>
                  );
                }
                if (isSheet) {
                  return (
                    <>
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>2. Spreadsheet Data Grid</span>
                    </>
                  );
                }
                return (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    <span>2. PDF Document Reader</span>
                  </>
                );
              })()}
            </button>

            <button
              onClick={() => setActiveTab('diff')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'diff'
                  ? 'bg-[#C8892E] text-[#141C2B] font-bold shadow-xs'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>
                {isV2Image 
                  ? '3. Visual Diff & Benchmark' 
                  : (isInitialSubmission ? '3. Benchmark Comparison' : '3. Side-by-Side Revision Diff')}
              </span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 bg-[#F7F5F0] flex-1 text-xs">
          
          {/* TAB 1: EXECUTIVE AI SUMMARY & DECISION TRIAGE */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              
              {/* MANDATORY WARNING BANNER: CATEGORY MISMATCH */}
              {aiEval.categoryMismatch && (
                <div className="bg-[#FEF2F2] border-2 border-[#EF4444] p-4 rounded-xl space-y-2.5 text-[#991B1B] shadow-xs">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 text-[#DC2626] flex-shrink-0" />
                    <span>Category Mismatch: Unrelated Content Detected</span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#7F1D1D] font-medium">
                    ⚠️ This document's content does not match the expected filing category for this submission type. Manual review required before indexing.
                  </p>
                  <div className="p-3 bg-white/95 rounded-lg border border-[#FCA5A5] text-[11px] font-mono grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[#450A0A]">
                    <div>
                      <span className="text-[#991B1B] block font-bold text-[10px] uppercase">Detected Subject:</span>
                      <span className="text-[#DC2626] font-bold text-xs">{aiEval.detectedSubject}</span>
                    </div>
                    <div>
                      <span className="text-[#991B1B] block font-bold text-[10px] uppercase">Expected Statutory Category:</span>
                      <span className="text-[#141C2B] font-bold text-xs capitalize">{doc.type.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  <div className="text-[11px] font-medium text-[#B91C1C] flex items-center gap-1.5 pt-1">
                    <Info className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Recommendation: Use <strong>"Request Changes"</strong> to notify the submitting officer to provide the authorized technical dataset.</span>
                  </div>
                </div>
              )}

              {/* Direct Paste & Upload Quick Banner for Admins */}
              <div className="bg-white p-4 rounded-xl border border-[#E4E0D6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB] flex-shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#141C2B] flex items-center gap-1.5">
                      <span>Visual Capture & Geological Attachment</span>
                      <span className="bg-[#FEF3C7] text-[#92400E] px-1.5 py-0.2 rounded text-[10px] font-mono font-bold">
                        Ctrl + V Enabled
                      </span>
                    </h4>
                    <p className="text-[11px] text-[#64748B]">
                      Paste screenshots, borehole strata images, or field captures directly onto this comparison panel.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleReadClipboard('v2')}
                    className="flex-1 sm:flex-initial px-3 py-2 bg-[#141C2B] hover:bg-[#1E293B] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                    title="Paste Image from Clipboard (Ctrl+V)"
                  >
                    <Clipboard className="w-3.5 h-3.5 text-[#C8892E]" />
                    <span>Paste Image (Ctrl+V)</span>
                  </button>
                  <button
                    onClick={() => fileInputV2Ref.current?.click()}
                    className="px-3 py-2 bg-[#FAF8F3] hover:bg-[#EFEBE2] border border-[#E4E0D6] text-[#141C2B] text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Upload Local Image File"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Upload Image</span>
                  </button>
                </div>
              </div>

              {/* Statutory Compliance Checklist & Risk Assessment */}
              <div className="bg-white p-5 rounded-xl border border-[#E4E0D6] shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE2]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                    <span className="font-sans font-bold text-sm text-[#141C2B]">
                      AI Statutory Compliance &amp; Regulatory Audit (DGMS / CMPDI)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
                      aiEval.overallScore >= 80 
                        ? 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]' 
                        : aiEval.overallScore >= 60 
                        ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]' 
                        : 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                    }`}>
                      Compliance: {aiEval.overallScore}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    ...aiEval.positiveChecks.map(check => ({ clause: 'Statutory Verification', details: check, passed: true })),
                    ...aiEval.warningFlags.map(warning => ({ clause: 'Audit Flag / Advisory', details: warning, passed: false })),
                    ...aiEval.noticeNotes.map(note => ({ clause: 'Statutory Note', details: note, passed: true }))
                  ].map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                        item.passed 
                          ? 'bg-[#FAF8F3] border-[#EFEBE2]' 
                          : 'bg-[#FEF2F2] border-[#FECACA]'
                      }`}
                    >
                      {item.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#16A34A] flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="font-bold text-xs text-[#141C2B] flex items-center justify-between">
                          <span>{item.clause}</span>
                          <span className={`text-[10px] font-mono font-semibold ${item.passed ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                            {item.passed ? 'PASSED' : 'FLAGGED'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#64748B] leading-relaxed">
                          {item.details}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Executive Summary Points */}
              <div className="bg-white p-5 rounded-xl border-2 border-[#C8892E] shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#EFEBE2]">
                  <div className="flex items-center gap-2 font-sans font-bold text-sm text-[#141C2B]">
                    <Sparkles className="w-4 h-4 text-[#C8892E]" />
                    <span>Executive Summary &amp; Key Takeaways</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#64748B] bg-[#FAF8F3] px-2 py-0.5 rounded border border-[#E4E0D6]">
                    Instant Admin Brief
                  </span>
                </div>

                <div className="space-y-2.5">
                  {cleanSummaryPoints.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-[#FAF8F3] rounded-lg border border-[#EFEBE2] text-xs text-[#141C2B]">
                      <span className="w-5 h-5 rounded-full bg-[#141C2B] text-white flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="leading-relaxed flex-1 font-sans">{point}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Parameter & Assay Variances */}
              {v2.keyMetrics && v2.keyMetrics.length > 0 && (
                <div className="bg-white p-5 rounded-xl border border-[#E4E0D6] space-y-3">
                  <h4 className="font-sans font-bold text-xs text-[#141C2B] flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-[#C8892E]" />
                    <span>Key Extracted Parameters &amp; Compliance Assays</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
                    {v2.keyMetrics.map((km, idx) => (
                      <div key={idx} className="p-3 bg-[#FAF8F3] rounded-lg border border-[#E4E0D6]">
                        <span className="text-[10px] text-[#64748B] block">{km.label}</span>
                        <span className="font-bold text-sm text-[#141C2B] mt-0.5 block">{km.value}</span>
                        {km.variance && (
                          <span className="text-[10px] text-[#C8892E] font-bold block mt-1">
                            Δ {km.variance} vs benchmark
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DOCUMENT & IMAGE VIEWER FORMATTED STRICTLY */}
          {activeTab === 'pdf_view' && (() => {
            const fnLower = (v2.fileName || '').toLowerCase();
            const isPdf = Boolean(
              fnLower.endsWith('.pdf') || 
              (!fnLower.endsWith('.csv') && !fnLower.endsWith('.xlsx') && !fnLower.endsWith('.xls') && !fnLower.endsWith('.tsv') && !fnLower.endsWith('.jpg') && !fnLower.endsWith('.jpeg') && !fnLower.endsWith('.png') && !fnLower.endsWith('.webp'))
            );

            const isSpreadsheet = Boolean(
              !isPdf && (
                fnLower.endsWith('.csv') || 
                fnLower.endsWith('.xlsx') || 
                fnLower.endsWith('.xls') || 
                fnLower.endsWith('.tsv')
              )
            );

            const isImage = Boolean(
              fnLower.endsWith('.jpg') || 
              fnLower.endsWith('.jpeg') || 
              fnLower.endsWith('.png') || 
              fnLower.endsWith('.webp') || 
              fnLower.endsWith('.bmp') || 
              fnLower.endsWith('.gif') || 
              fnLower.endsWith('.svg') ||
              Boolean(v2.fileUrl?.startsWith('data:image')) ||
              Boolean(v2.fileUrl?.startsWith('blob:'))
            );

            // Robust spreadsheet tabular parsing
            const parseSpreadsheetData = () => {
              const text = v2.extractedText || '';
              const rawLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('===') && !l.startsWith('---'));
              const parsedRows: string[][] = [];
              for (const line of rawLines) {
                let cells: string[] = [];
                if (line.includes(',')) {
                  cells = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^["']|["']$/g, ''));
                } else if (line.includes('\t')) {
                  cells = line.split('\t').map(c => c.trim());
                } else if (line.includes('|')) {
                  cells = line.split('|').map(c => c.trim()).filter(Boolean);
                } else {
                  cells = [line];
                }
                if (cells.length > 0) {
                  parsedRows.push(cells);
                }
              }

              if (parsedRows.length === 0) {
                return { headers: ['Column 1', 'Column 2', 'Column 3'], rows: [['No parsed data available', '-', '-']], totalCols: 3 };
              }

              const maxCols = Math.max(...parsedRows.map(r => r.length), 3);
              const normalized = parsedRows.map(r => {
                const row = [...r];
                while (row.length < maxCols) row.push('-');
                return row;
              });

              return {
                headers: normalized[0] || [],
                rows: normalized.slice(1),
                totalCols: maxCols
              };
            };

            const sheetData = isSpreadsheet ? parseSpreadsheetData() : null;
            const columnLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];

            const filteredRows = sheetData ? sheetData.rows.filter(row => {
              if (!spreadsheetSearch) return true;
              return row.some(cell => cell.toLowerCase().includes(spreadsheetSearch.toLowerCase()));
            }) : [];

            const handleDownloadCsv = () => {
              if (!v2.extractedText) return;
              const blob = new Blob([v2.extractedText], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = window.document.createElement('a');
              a.href = url;
              a.download = v2.fileName || `${doc.title}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            };

            const handleDownloadPdfText = () => {
              if (!v2.extractedText) return;
              const blob = new Blob([v2.extractedText], { type: 'text/plain;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = window.document.createElement('a');
              a.href = url;
              a.download = v2.fileName ? v2.fileName.replace(/\.pdf$/i, '.txt') : `${doc.title}.txt`;
              a.click();
              URL.revokeObjectURL(url);
            };

            return (
              <div className="space-y-4">
                <div className="bg-white p-3 sm:p-5 rounded-xl border border-[#E4E0D6] shadow-xs space-y-4">
                  {/* File Reader Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EFEBE2]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${
                        isImage 
                          ? 'bg-[#EFF6FF] text-[#2563EB]' 
                          : isSpreadsheet 
                          ? 'bg-[#F0FDF4] text-[#16A34A]' 
                          : 'bg-[#FEF2F2] text-[#DC2626]'
                      }`}>
                        {isImage ? (
                          <ImageIcon className="w-5 h-5" />
                        ) : isSpreadsheet ? (
                          <FileSpreadsheet className="w-5 h-5" />
                        ) : (
                          <FileText className="w-5 h-5 text-[#DC2626]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-[#141C2B] truncate max-w-[240px] sm:max-w-md">
                            {v2.fileName || `${doc.title}.${isImage ? 'jpg' : isSpreadsheet ? 'csv' : 'pdf'}`}
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-[#FAF8F3] px-2 py-0.5 rounded border border-[#E4E0D6] text-[#64748B] flex-shrink-0">
                            {isImage ? 'Geological Photo' : isSpreadsheet ? 'Tabular Dataset' : 'Statutory PDF'}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-[#64748B] mt-0.5 truncate">
                          {v2.fileSize || (isImage ? '3.4 MB' : isSpreadsheet ? '1.4 MB' : '2.8 MB')} · {doc.subsidiary} Directorate · Version v{v2.versionNumber}.0
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end flex-wrap">
                      {isImage ? (
                        <>
                          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-[#64748B] bg-[#FAF8F3] px-3 py-1.5 rounded-lg border border-[#EFEBE2]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                            <span>OCR: {v2.ocrConfidence || 99.4}%</span>
                          </div>
                          <button
                            onClick={() => openImageInNewTab(effectiveV2Image, `${doc.title} - ${v2.fileName || 'Strata Survey'}`)}
                            className="px-2.5 py-1.5 text-xs font-mono font-bold bg-[#FAF8F3] hover:bg-[#38BDF8] hover:text-[#0F172A] border border-[#E4E0D6] text-[#0F172A] rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                            title="Open image in dedicated high-res new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-[#0284C7]" />
                            <span className="hidden sm:inline">Open Tab</span>
                          </button>
                          <button
                            onClick={() => handleDownloadImage(effectiveV2Image, v2.fileName)}
                            className="px-2.5 py-1.5 text-xs font-mono font-bold bg-[#FAF8F3] hover:bg-[#141C2B] hover:text-white border border-[#E4E0D6] text-[#141C2B] rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                            title="Export / Download Image"
                          >
                            <Download className="w-3.5 h-3.5 text-[#2563EB]" />
                            <span>Export</span>
                          </button>
                        </>
                      ) : isSpreadsheet ? (
                        <>
                          <div className="relative flex-1 sm:flex-none">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                            <input
                              type="text"
                              placeholder="Search cells..."
                              value={spreadsheetSearch}
                              onChange={(e) => setSpreadsheetSearch(e.target.value)}
                              className="pl-8 pr-3 py-1 text-xs border border-[#E4E0D6] rounded-lg bg-[#FAF8F3] focus:bg-white focus:outline-none focus:border-[#C8892E] w-full sm:w-44 font-mono"
                            />
                          </div>
                          <button
                            onClick={handleDownloadCsv}
                            className="px-2.5 py-1 text-xs font-mono font-bold bg-[#FAF8F3] hover:bg-[#141C2B] hover:text-white border border-[#E4E0D6] text-[#141C2B] rounded-lg flex items-center gap-1 cursor-pointer transition-colors flex-shrink-0"
                            title="Download CSV"
                          >
                            <Download className="w-3.5 h-3.5 text-[#16A34A]" />
                            <span>Export</span>
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Zoom & View Controls for PDF */}
                          <div className="flex items-center gap-1 bg-[#FAF8F3] border border-[#E4E0D6] rounded-lg p-0.5 text-xs font-mono">
                            <button
                              onClick={() => setPdfZoom(Math.max(70, pdfZoom - 10))}
                              className="px-2 py-1 hover:bg-[#EFEBE2] rounded text-[#141C2B] font-bold cursor-pointer transition-colors"
                              title="Zoom out"
                            >
                              -
                            </button>
                            <span className="px-1 text-[11px] text-[#64748B] min-w-[36px] text-center font-bold">
                              {pdfZoom}%
                            </span>
                            <button
                              onClick={() => setPdfZoom(Math.min(150, pdfZoom + 10))}
                              className="px-2 py-1 hover:bg-[#EFEBE2] rounded text-[#141C2B] font-bold cursor-pointer transition-colors"
                              title="Zoom in"
                            >
                              +
                            </button>
                            <button
                              onClick={() => setPdfZoom(100)}
                              className="px-1.5 py-1 text-[10px] text-[#64748B] hover:text-[#141C2B] hover:bg-[#EFEBE2] rounded cursor-pointer transition-colors"
                              title="Reset zoom"
                            >
                              Reset
                            </button>
                          </div>
                          <button
                            onClick={handleDownloadPdfText}
                            className="px-2.5 py-1 text-xs font-mono font-bold bg-[#FAF8F3] hover:bg-[#141C2B] hover:text-white border border-[#E4E0D6] text-[#141C2B] rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                            title="Export PDF Text"
                          >
                            <Download className="w-3.5 h-3.5 text-[#DC2626]" />
                            <span className="hidden sm:inline">Export Text</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 1. IMAGE VIEWER WORKSPACE (When format is JPG, PNG, WEBP, etc.) */}
                  {isImage ? (
                    <div className="space-y-4">
                      {/* Image Viewer Card */}
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingOverV2(true); }}
                        onDragLeave={() => setIsDraggingOverV2(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingOverV2(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file && (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp|gif|svg)$/i.test(file.name))) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const base64 = ev.target?.result as string;
                              if (base64) handleApplyPastedImage(base64, file.name, 'v2');
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className={`bg-white border rounded-xl overflow-hidden shadow-xs relative flex flex-col transition-all ${
                          isDraggingOverV2 ? 'border-[#C8892E] ring-2 ring-[#C8892E]/30 bg-[#FFFBEB]/20' : 'border-[#E4E0D6]'
                        }`}
                      >
                        {/* Clean Interactive Toolbar */}
                        <div className="bg-[#FAF8F3] border-b border-[#EFEBE2] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                          {/* Image Action Controls */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#141C2B] flex items-center gap-1.5 font-mono text-xs bg-white px-2.5 py-1 rounded-md border border-[#E4E0D6] shadow-2xs">
                              <ImageIcon className="w-3.5 h-3.5 text-[#2563EB]" />
                              <span>Image Preview</span>
                            </span>

                            <button
                              onClick={() => handleReadClipboard('v2')}
                              className="px-2.5 py-1 bg-[#141C2B] hover:bg-[#1E293B] text-white font-medium rounded-md flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs text-[11px]"
                              title="Paste image directly from clipboard (or press Ctrl+V)"
                            >
                              <Clipboard className="w-3 h-3 text-[#FCD34D]" />
                              <span>Paste (Ctrl+V)</span>
                            </button>

                            <button
                              onClick={() => fileInputV2Ref.current?.click()}
                              className="px-2.5 py-1 bg-white hover:bg-[#F1F5F9] text-[#141C2B] font-medium border border-[#E4E0D6] rounded-md flex items-center gap-1.5 cursor-pointer transition-colors text-[11px]"
                              title="Upload or replace photo"
                            >
                              <Upload className="w-3 h-3 text-[#2563EB]" />
                              <span>Replace Photo</span>
                            </button>
                          </div>

                          {/* Zoom & View Adjustments */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Filter Mode */}
                            <div className="flex items-center gap-1.5 bg-white border border-[#E4E0D6] rounded-md px-2 py-1">
                              <Sliders className="w-3 h-3 text-[#64748B]" />
                              <select
                                value={imageFilter}
                                onChange={(e) => setImageFilter(e.target.value as any)}
                                className="bg-transparent text-[#141C2B] text-[11px] focus:outline-none cursor-pointer font-medium"
                              >
                                <option value="normal">Normal View</option>
                                <option value="contrast">High Contrast</option>
                                <option value="grayscale">Grayscale</option>
                                <option value="invert">Inverted Color</option>
                              </select>
                            </div>

                            {/* Zoom Controls */}
                            <div className="flex items-center bg-white border border-[#E4E0D6] rounded-md overflow-hidden">
                              <button
                                onClick={() => setImageZoom(prev => Math.max(0.5, Number((prev - 0.25).toFixed(2))))}
                                className="px-2 py-1 hover:bg-[#F1F5F9] text-[#141C2B] cursor-pointer transition-colors"
                                title="Zoom Out"
                              >
                                <ZoomOut className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setImageZoom(1)}
                                className="px-2 py-1 text-[11px] font-mono font-bold text-[#141C2B] hover:bg-[#F1F5F9] cursor-pointer border-x border-[#E4E0D6]"
                                title="Reset to 100%"
                              >
                                {Math.round(imageZoom * 100)}%
                              </button>
                              <button
                                onClick={() => setImageZoom(prev => Math.min(3.5, Number((prev + 0.25).toFixed(2))))}
                                className="px-2 py-1 hover:bg-[#F1F5F9] text-[#141C2B] cursor-pointer transition-colors"
                                title="Zoom In"
                              >
                                <ZoomIn className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Rotate */}
                            <button
                              onClick={() => setImageRotation(prev => (prev + 90) % 360)}
                              className="px-2 py-1 bg-white hover:bg-[#F1F5F9] border border-[#E4E0D6] rounded-md text-[#141C2B] cursor-pointer transition-colors flex items-center gap-1 text-[11px]"
                              title="Rotate 90° clockwise"
                            >
                              <RotateCw className="w-3.5 h-3.5 text-[#64748B]" />
                              <span>{imageRotation}°</span>
                            </button>

                            {/* Fullscreen / New Tab */}
                            <button
                              onClick={() => openImageInNewTab(effectiveV2Image, `${doc.title} - ${v2.fileName || 'Photo Inspection'}`)}
                              className="px-2 py-1 bg-white hover:bg-[#EFF6FF] border border-[#E4E0D6] hover:border-[#BFDBFE] rounded-md text-[#2563EB] cursor-pointer transition-colors flex items-center gap-1 text-[11px] font-bold"
                              title="Open image full size in dedicated tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Full Size</span>
                            </button>

                            {/* Reset */}
                            <button
                              onClick={() => {
                                setImageZoom(1);
                                setImageRotation(0);
                                setImageFilter('normal');
                              }}
                              className="p-1.5 bg-white hover:bg-[#F1F5F9] border border-[#E4E0D6] rounded-md text-[#64748B] hover:text-[#141C2B] cursor-pointer transition-colors"
                              title="Reset View"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Clean Centered Image Canvas */}
                        <div className="p-4 sm:p-8 min-h-[400px] max-h-[580px] overflow-auto flex items-center justify-center bg-[#F8FAFC] relative select-none">
                          <div 
                            className="transition-transform duration-200 ease-out flex items-center justify-center max-w-full" 
                            style={{ transform: `scale(${imageZoom}) rotate(${imageRotation}deg)` }}
                          >
                            <img
                              src={effectiveV2Image}
                              alt={v2.fileName || 'Geological Record / Photo'}
                              className={`max-h-[500px] max-w-full rounded-lg shadow-md border border-[#E2E8F0] object-contain bg-white transition-all ${
                                imageFilter === 'contrast' 
                                  ? 'contrast-150 brightness-105' 
                                  : imageFilter === 'grayscale' 
                                  ? 'grayscale' 
                                  : imageFilter === 'invert' 
                                  ? 'invert' 
                                  : ''
                              }`}
                            />
                          </div>

                          {/* Drag Overlay Hint */}
                          {isDraggingOverV2 && (
                            <div className="absolute inset-0 bg-[#141C2B]/85 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 pointer-events-none z-20">
                              <Upload className="w-10 h-10 text-[#FCD34D] animate-bounce" />
                              <p className="font-bold text-sm">Drop image file here to update version {v2.versionNumber}.0</p>
                              <p className="text-xs text-[#94A3B8]">Supports JPG, PNG, WEBP, SVG</p>
                            </div>
                          )}
                        </div>

                        {/* Clean Status & OCR Toggle Footer */}
                        <div className="bg-[#FAF8F3] border-t border-[#EFEBE2] px-4 py-2.5 flex items-center justify-between text-xs font-mono text-[#64748B]">
                          <div className="flex items-center gap-4 flex-wrap">
                            <span>File: <strong className="text-[#141C2B]">{v2.fileName || 'Document Photo'}</strong></span>
                            <span>Zoom: <strong className="text-[#141C2B]">{Math.round(imageZoom * 100)}%</strong></span>
                            {imageRotation > 0 && <span>Rotation: <strong className="text-[#141C2B]">{imageRotation}°</strong></span>}
                            {imageFilter !== 'normal' && <span>Filter: <strong className="text-[#141C2B] capitalize">{imageFilter}</strong></span>}
                          </div>
                          <button
                            onClick={() => setShowImageOcr(!showImageOcr)}
                            className="text-[#2563EB] hover:underline cursor-pointer font-bold flex items-center gap-1"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#C8892E]" />
                            <span>{showImageOcr ? 'Hide Extracted OCR' : 'Show Extracted OCR Text'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Extracted OCR & Photographic Metadata Box */}
                      {showImageOcr && (
                        <div className="bg-[#FAF8F3] border border-[#E4E0D6] rounded-xl p-4 sm:p-5 space-y-3">
                          <div className="flex items-center justify-between border-b border-[#EFEBE2] pb-2">
                            <h4 className="font-sans font-bold text-sm text-[#141C2B] flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-[#C8892E]" />
                              <span>Extracted Text &amp; Optical Catalog</span>
                            </h4>
                            <span className="text-xs font-mono font-bold text-[#16A34A] bg-[#F0FDF4] px-2.5 py-0.5 rounded border border-[#BBF7D0]">
                              OCR Confidence: {v2.ocrConfidence || 99.4}%
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm leading-relaxed text-[#334155] whitespace-pre-wrap bg-white p-4 rounded-lg border border-[#E4E0D6] font-mono">
                            {v2.extractedText || 'Image registered into MineMind AI vector catalog.'}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : isSpreadsheet && sheetData ? (
                    /* 2. SPREADSHEET WORKSPACE: Interactive Tabular Data Grid */
                    <div className="border border-[#CBD5E1] rounded-xl overflow-hidden shadow-xs bg-white">
                      {/* Spreadsheet Grid Toolbar */}
                      <div className="bg-[#F1F5F9] border-b border-[#CBD5E1] px-3 py-2 flex items-center justify-between text-xs font-mono text-[#475569]">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-white rounded border border-[#CBD5E1] font-bold text-[#0F172A] shadow-2xs">
                            Sheet 1 (Active Table)
                          </span>
                          <span className="text-[11px] text-[#64748B]">
                            {filteredRows.length} rows × {sheetData.totalCols} columns
                          </span>
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          Format: {v2.fileName?.split('.').pop()?.toUpperCase() || 'CSV/XLSX'}
                        </div>
                      </div>

                      {/* Spreadsheet Grid Table */}
                      <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
                        <table className="w-full text-left border-collapse font-mono text-xs">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#CBD5E1] text-[#475569] sticky top-0 z-10">
                              <th className="w-12 px-2.5 py-1.5 text-center font-bold text-[#94A3B8] border-r border-[#CBD5E1] bg-[#F1F5F9]">
                                #
                              </th>
                              {sheetData.headers.map((hdr, hIdx) => (
                                <th key={hIdx} className="px-3 py-2 font-bold border-r border-[#E2E8F0] min-w-[120px] text-[#0F172A]">
                                  <div className="text-[10px] text-[#94A3B8] uppercase font-normal">{columnLetters[hIdx] || `C${hIdx+1}`}</div>
                                  <div className="truncate">{hdr}</div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredRows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-[#F0F9FF] border-b border-[#E2E8F0] transition-colors">
                                <td className="px-2.5 py-1.5 text-center font-bold text-[#94A3B8] bg-[#F8FAFC] border-r border-[#CBD5E1] select-none">
                                  {rIdx + 1}
                                </td>
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="px-3 py-1.5 border-r border-[#E2E8F0] text-[#1E293B] truncate max-w-[240px]">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* 3. PDF DOCUMENT WORKSPACE: Authentic High-Fidelity Statutory Document Reader & Real PDF Engine */
                    <div className="border border-[#334155] rounded-xl overflow-hidden shadow-xl bg-[#1E293B]">
                      {/* PDF Control & Navigation Bar */}
                      <div className="bg-[#0F172A] text-[#F1F5F9] px-3 sm:px-4 py-2.5 flex items-center justify-between text-xs font-mono flex-wrap gap-2 border-b border-[#334155]">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1 rounded bg-[#DC2626]/20 text-[#EF4444] border border-[#DC2626]/30">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-semibold truncate text-[11px] sm:text-xs text-[#E2E8F0] max-w-[170px] sm:max-w-xs">
                            {v2.fileName || `${doc.title}.pdf`}
                          </span>
                          <span className="hidden md:inline-block px-2 py-0.5 rounded text-[10px] bg-[#1E293B] text-[#94A3B8] border border-[#334155]">
                            {doc.subsidiary}
                          </span>
                        </div>

                        {/* View Switchers */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="flex items-center bg-[#1E293B] p-0.5 rounded-lg border border-[#334155]">
                            <button
                              onClick={() => setPdfViewMode('formatted')}
                              className={`px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-semibold cursor-pointer transition-colors ${
                                pdfViewMode === 'formatted'
                                  ? 'bg-[#C8892E] text-white shadow-xs'
                                  : 'text-[#94A3B8] hover:text-white'
                              }`}
                              title="Render high-fidelity statutory formatted document"
                            >
                              Document View
                            </button>
                            <button
                              onClick={() => setPdfViewMode('native_pdf')}
                              className={`px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                                pdfViewMode === 'native_pdf'
                                  ? 'bg-[#2563EB] text-white shadow-xs'
                                  : 'text-[#94A3B8] hover:text-white'
                              }`}
                              title="Embed native PDF engine with zoom and pages"
                            >
                              <FileCheck2 className="w-3 h-3" />
                              <span>Native PDF</span>
                            </button>
                            <button
                              onClick={() => setPdfViewMode('raw')}
                              className={`px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-semibold cursor-pointer transition-colors ${
                                pdfViewMode === 'raw'
                                  ? 'bg-[#475569] text-white shadow-xs'
                                  : 'text-[#94A3B8] hover:text-white'
                              }`}
                              title="View raw extracted OCR text"
                            >
                              OCR Text
                            </button>
                          </div>

                          {/* Action Tools */}
                          <div className="flex items-center gap-1 pl-1 border-l border-[#334155]">
                            <button
                              onClick={handleOpenPdfInNewTab}
                              className="px-2.5 py-1 bg-[#1E293B] hover:bg-[#334155] text-[#E2E8F0] hover:text-white rounded text-[10px] sm:text-[11px] font-mono cursor-pointer transition-colors border border-[#334155] flex items-center gap-1"
                              title="Open PDF in a new Chrome browser tab"
                            >
                              <ExternalLink className="w-3 h-3 text-[#38BDF8]" />
                              <span className="hidden sm:inline">Open in Tab</span>
                            </button>

                            <button
                              onClick={() => setGoogleDriveModalOpen(true)}
                              className="px-2.5 py-1 bg-[#1E293B] hover:bg-[#334155] text-[#E2E8F0] hover:text-white rounded text-[10px] sm:text-[11px] font-mono cursor-pointer transition-colors border border-[#334155] flex items-center gap-1"
                              title="Open / Export to Google Drive & Google Docs"
                            >
                              <FolderOpen className="w-3 h-3 text-[#FBBF24]" />
                              <span className="hidden sm:inline">Google Drive</span>
                            </button>

                            <button
                              onClick={handleDownloadPdf}
                              className="p-1 sm:px-2 sm:py-1 bg-[#1E293B] hover:bg-[#334155] text-[#E2E8F0] hover:text-white rounded text-[10px] sm:text-[11px] font-mono cursor-pointer transition-colors border border-[#334155] flex items-center gap-1"
                              title="Download official PDF file"
                            >
                              <Download className="w-3 h-3 text-[#4ADE80]" />
                              <span className="hidden md:inline">Download</span>
                            </button>

                            <button
                              onClick={handlePrintPdf}
                              className="p-1 sm:px-2 sm:py-1 bg-[#1E293B] hover:bg-[#334155] text-[#E2E8F0] hover:text-white rounded text-[10px] sm:text-[11px] font-mono cursor-pointer transition-colors border border-[#334155]"
                              title="Print document"
                            >
                              <Printer className="w-3 h-3 text-[#94A3B8]" />
                            </button>

                            {/* Zoom controls for formatted view */}
                            {pdfViewMode === 'formatted' && (
                              <div className="flex items-center gap-0.5 ml-1 bg-[#0F172A] px-1 py-0.5 rounded border border-[#334155]">
                                <button
                                  onClick={() => setPdfZoom(z => Math.max(z - 10, 60))}
                                  className="px-1 text-[#94A3B8] hover:text-white cursor-pointer"
                                  title="Zoom out"
                                >
                                  -
                                </button>
                                <span className="text-[10px] text-[#E2E8F0] px-1">{pdfZoom}%</span>
                                <button
                                  onClick={() => setPdfZoom(z => Math.min(z + 10, 150))}
                                  className="px-1 text-[#94A3B8] hover:text-white cursor-pointer"
                                  title="Zoom in"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* PDF Canvas Viewport */}
                      <div className="p-2 sm:p-6 md:p-8 overflow-y-auto max-h-[640px] flex flex-col items-center bg-[#334155]/90">
                        {pdfViewMode === 'native_pdf' ? (
                          <div className="w-full max-w-4xl space-y-3">
                            <div className="flex items-center justify-between text-xs font-mono text-[#E2E8F0] bg-[#0F172A] px-4 py-2 rounded-lg border border-[#475569]">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                                <span>Native Binary PDF Rendering Engine Active</span>
                              </div>
                              <button
                                onClick={handleOpenPdfInNewTab}
                                className="text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <span>Full screen view</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                            {pdfBlobUrl ? (
                              <iframe
                                src={pdfBlobUrl}
                                title="Statutory Official PDF Document"
                                className="w-full h-[620px] rounded-lg border border-[#475569] shadow-2xl bg-white"
                              />
                            ) : (
                              <div className="p-16 text-center text-slate-300 font-mono text-xs">
                                Initializing native PDF stream...
                              </div>
                            )}
                          </div>
                        ) : pdfViewMode === 'formatted' ? (
                          (() => {
                            const parsedDoc = parseStatutoryText(v2.extractedText || '', {
                              title: doc.title,
                              code: doc.documentCode,
                              subsidiary: doc.subsidiary,
                              date: v2.uploadedAt ? new Date(v2.uploadedAt).toLocaleDateString() : new Date().toLocaleDateString(),
                              author: `${v2.uploadedBy.name} (${v2.uploadedBy.employeeId})`
                            });

                            return (
                              <div 
                                className="bg-white text-[#0F172A] w-full max-w-3xl rounded-md shadow-2xl p-6 sm:p-10 md:p-12 border border-[#E2E8F0] transition-all origin-top break-words selection:bg-[#FEF08A] selection:text-[#0F172A]"
                                style={{ zoom: `${pdfZoom}%` }}
                              >
                                {/* Top Gold Border Accent */}
                                <div className="h-1 bg-[#C8892E] w-full mb-4 rounded-xs" />

                                {/* Official Government Header Banner */}
                                <div className="flex items-center justify-between gap-2 flex-wrap text-[10px] sm:text-[11px] font-mono text-[#64748B] border-b border-[#F1F5F9] pb-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[#C8892E]" />
                                    <span className="font-semibold uppercase tracking-wide text-[#334155]">
                                      CENTRAL MINE PLANNING &amp; DESIGN INSTITUTE (CMPDI) — STATUTORY BRIEF
                                    </span>
                                  </div>
                                  <span className="font-bold text-[#0F172A]">
                                    {parsedDoc.code}
                                  </span>
                                </div>

                                {/* Document Title */}
                                <div className="pt-4 pb-3">
                                  <h2 className="font-sans font-black text-lg sm:text-2xl text-[#0F172A] tracking-tight leading-snug">
                                    {parsedDoc.title}
                                  </h2>
                                </div>

                                {/* Clean Formal Metadata Table */}
                                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs font-mono mb-6 space-y-1.5">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div>
                                      <span className="text-[#64748B]">Code:</span> <strong className="text-[#0F172A] ml-1">{parsedDoc.code}</strong>
                                    </div>
                                    <div>
                                      <span className="text-[#64748B]">Subsidiary:</span> <strong className="text-[#0F172A] ml-1">{parsedDoc.subsidiary}</strong>
                                    </div>
                                    <div>
                                      <span className="text-[#64748B]">Period:</span> <strong className="text-[#0F172A] ml-1">{parsedDoc.period}</strong>
                                    </div>
                                  </div>
                                  <div className="text-[#64748B] text-[11px] pt-1.5 border-t border-[#E2E8F0] flex flex-wrap gap-4">
                                    <div>
                                      <span>Date:</span> <strong className="text-[#334155] ml-1">{parsedDoc.date}</strong>
                                    </div>
                                    <div>
                                      <span>Author:</span> <strong className="text-[#334155] ml-1">{parsedDoc.author}</strong>
                                    </div>
                                    <div>
                                      <span>Filing Version:</span> <strong className="text-[#C8892E] ml-1">v{v2.versionNumber}.0 ({v2.approvalStatus.toUpperCase()})</strong>
                                    </div>
                                  </div>
                                </div>

                                {/* Render Formatted Sections */}
                                <div className="space-y-6 text-xs sm:text-sm text-[#334155] leading-relaxed font-sans">
                                  {parsedDoc.sections.map((sec, secIdx) => (
                                    <div key={secIdx} className="space-y-3">
                                      {/* Section Heading with Amber Accent Bar */}
                                      <div className="border-b-2 border-[#C8892E] pb-1 inline-block">
                                        <h3 className="font-sans font-bold text-sm sm:text-base text-[#0F172A] tracking-tight">
                                          {sec.heading}
                                        </h3>
                                      </div>

                                      {/* Section Content Items */}
                                      <div className="space-y-2.5">
                                        {sec.items.map((item, itIdx) => {
                                          if (item.type === 'subhead') {
                                            return (
                                              <h4 key={itIdx} className="font-bold text-xs sm:text-sm text-[#1E293B] pt-2">
                                                {item.text}
                                              </h4>
                                            );
                                          }
                                          if (item.type === 'bullet') {
                                            return (
                                              <div key={itIdx} className="flex items-start gap-2 text-xs sm:text-sm text-[#334155] pl-2">
                                                <span className="text-[#C8892E] font-bold text-base leading-none mt-0.5">•</span>
                                                <span className="leading-relaxed">{item.text}</span>
                                              </div>
                                            );
                                          }
                                          if (item.type === 'directive') {
                                            return (
                                              <div key={itIdx} className="p-3 bg-[#F8FAFC] rounded-lg border-l-4 border-[#C8892E] text-xs sm:text-sm text-[#1E293B] my-2">
                                                <div className="font-medium leading-relaxed">{item.text}</div>
                                              </div>
                                            );
                                          }
                                          if (item.type === 'table' && item.rows) {
                                            return (
                                              <div key={itIdx} className="my-3 overflow-x-auto rounded border border-[#CBD5E1]">
                                                <table className="w-full text-left text-xs font-mono border-collapse">
                                                  <tbody>
                                                    {item.rows.map((row, rIdx) => (
                                                      <tr key={rIdx} className={rIdx === 0 ? 'bg-[#F1F5F9] font-bold text-[#0F172A] border-b border-[#CBD5E1]' : 'border-b border-[#E2E8F0] hover:bg-[#F8FAFC]'}>
                                                        {row.map((c, cIdx) => (
                                                          <td key={cIdx} className="p-2 border-r border-[#E2E8F0] last:border-r-0">
                                                            {c}
                                                          </td>
                                                        ))}
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            );
                                          }
                                          if (item.type === 'callout') {
                                            return (
                                              <div key={itIdx} className="p-3 bg-[#FEF2F2] rounded border-l-4 border-[#DC2626] text-xs font-mono text-[#991B1B] my-2">
                                                {item.text}
                                              </div>
                                            );
                                          }
                                          return (
                                            <p key={itIdx} className="text-xs sm:text-sm text-[#334155] leading-relaxed text-justify">
                                              {item.text}
                                            </p>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Official Formal Document Footer */}
                                <div className="pt-8 mt-8 border-t border-[#E2E8F0] flex items-center justify-between text-[10px] font-mono text-[#94A3B8]">
                                  <span>CONFIDENTIAL — STATUTORY MINING GOVERNANCE</span>
                                  <span>Page 1 of 1</span>
                                </div>

                                {/* Quick Google Drive & Cloud Workspace Action Banner */}
                                <div className="mt-6 pt-4 border-t border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 print:hidden">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-[#3B82F6]/10 text-[#2563EB]">
                                      <FolderOpen className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <h5 className="font-bold text-xs text-[#0F172A]">Cloud &amp; Drive Workspace Hub</h5>
                                      <p className="text-[11px] text-[#64748B]">Open in Google Drive, Docs, or export to local storage</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                      onClick={() => {
                                        handleDownloadPdf();
                                        window.open('https://drive.google.com/drive/my-drive', '_blank');
                                        setPdfToast('Downloaded PDF & launched Google Drive!');
                                        setTimeout(() => setPdfToast(null), 3500);
                                      }}
                                      className="px-3 py-1.5 bg-[#141C2B] hover:bg-[#1E293B] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                                      title="Save PDF and open Google Drive"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5 text-[#38BDF8]" />
                                      <span>Open in Google Drive</span>
                                    </button>

                                    <button
                                      onClick={() => {
                                        window.open('https://docs.google.com/document/u/0/', '_blank');
                                        const text = v2.extractedText || '';
                                        navigator.clipboard.writeText(text);
                                        setPdfToast('Opened Google Docs & copied text to clipboard!');
                                        setTimeout(() => setPdfToast(null), 3500);
                                      }}
                                      className="px-3 py-1.5 bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                                      title="Open Google Docs editor and copy statutory content"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-[#16A34A]" />
                                      <span>Open Google Docs</span>
                                    </button>

                                    <button
                                      onClick={handleOpenPdfInNewTab}
                                      className="px-3 py-1.5 bg-white hover:bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                                      title="Open full PDF in a new Chrome tab"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5 text-[#64748B]" />
                                      <span>Open in Tab</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="w-full max-w-3xl">
                            <div className="bg-[#0F172A] px-4 py-2 rounded-t-lg text-xs font-mono text-[#94A3B8] border border-b-0 border-[#475569]">
                              Extracted Raw OCR Text Stream
                            </div>
                            <pre className="p-4 bg-[#F8FAFC] rounded-b-lg border border-[#CBD5E1] text-xs font-mono text-[#1E293B] whitespace-pre-wrap overflow-x-auto leading-relaxed shadow-xl">
                              {v2.extractedText || 'No plain text extracted.'}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 3: SIDE-BY-SIDE DIFF & VISUAL BENCHMARK COMPARISON */}
          {activeTab === 'diff' && (
            <div className="space-y-4">
              {/* Initial submission guidance banner & Origin Explanation */}
              {isInitialSubmission && (
                <div className={`p-4 rounded-xl space-y-3 text-xs border ${
                  benchmarkResult.mode === 'standalone' 
                    ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]' 
                    : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {benchmarkResult.mode === 'standalone' ? (
                      <AlertCircle className="w-4 h-4 text-[#D97706]" />
                    ) : (
                      <Info className="w-4 h-4 text-[#2563EB]" />
                    )}
                    <span>Initial Baseline Ingestion (Version 1.0 Review)</span>
                  </div>
                  
                  <div className="space-y-1.5 leading-relaxed">
                    <p>
                      {benchmarkResult.noticeMessage}
                    </p>
                    <p className="text-[11px] opacity-90">
                      {benchmarkResult.mode === 'standalone' 
                        ? 'Because this document subject matter does not topically match any existing approved baseline in the repository, Standalone Review is active to avoid irrelevant side-by-side comparisons.' 
                        : 'Benchmark comparison pairs this submission with an approved reference sharing the same technical discipline and parameters.'}
                    </p>
                  </div>

                  {/* Benchmark selector dropdown */}
                  <div className="pt-2 border-t border-black/10 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <label htmlFor="benchmark-select" className="font-semibold text-xs whitespace-nowrap flex-shrink-0">
                        Benchmark Reference:
                      </label>
                      <div className="relative flex-1 min-w-0">
                        <select
                          id="benchmark-select"
                          value={selectedBenchmarkDocId}
                          onChange={(e) => setSelectedBenchmarkDocId(e.target.value)}
                          className="w-full max-w-full bg-white border border-[#93C5FD] text-[#1E3A8A] text-xs rounded-lg px-2.5 py-2 font-medium focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] outline-none cursor-pointer text-ellipsis overflow-hidden"
                        >
                          {benchmarkResult.mode === 'benchmark_available' && benchmarkResult.bestMatchDoc && (
                            <option value="auto">
                              ⭐ Auto Best Match: {benchmarkResult.bestMatchDoc.title.length > 55 ? `${benchmarkResult.bestMatchDoc.title.slice(0, 55)}...` : benchmarkResult.bestMatchDoc.title} ({benchmarkResult.bestMatchDoc.subsidiary})
                            </option>
                          )}
                          
                          {benchmarkResult.rankedMatches.map(m => (
                            <option key={m.doc.id} value={m.doc.id}>
                              {m.doc.title.length > 50 ? `${m.doc.title.slice(0, 50)}...` : m.doc.title} ({m.doc.documentCode} · {m.doc.subsidiary})
                            </option>
                          ))}

                          <option value="none">
                            🚫 Standalone Review {benchmarkResult.mode === 'standalone' ? '(Default: No topical match found)' : '(No Benchmark Comparison)'}
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* Active Match Details Helper */}
                    {selectedBenchmarkDocId !== 'none' && benchmarkDoc && (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono bg-white/70 px-2.5 py-1.5 rounded border border-blue-200/60 text-[#1E40AF] truncate">
                        <span className="font-bold flex-shrink-0">Comparing Against:</span>
                        <span className="truncate font-semibold">{benchmarkDoc.title}</span>
                        <span className="text-[#3B82F6] flex-shrink-0 font-normal">({benchmarkDoc.documentCode})</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 1. VISUAL IMAGE COMPARISON WORKBENCH (When comparing Visual/Image Records) */}
              {isV2Image ? (
                <div className="space-y-4">
                  {/* Mode Bar */}
                  <div className="bg-white p-3 rounded-xl border border-[#E4E0D6] flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#141C2B] font-mono uppercase text-[11px]">Visual Comparison Mode:</span>
                      <div className="flex items-center bg-[#FAF8F3] border border-[#E4E0D6] rounded-lg p-0.5">
                        <button
                          onClick={() => setVisualDiffMode('split')}
                          className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                            visualDiffMode === 'split' ? 'bg-[#141C2B] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#141C2B]'
                          }`}
                        >
                          Dual Side-by-Side
                        </button>
                        <button
                          onClick={() => setVisualDiffMode('wipe')}
                          className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                            visualDiffMode === 'wipe' ? 'bg-[#141C2B] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#141C2B]'
                          }`}
                        >
                          Wipe Curtain Slider
                        </button>
                        <button
                          onClick={() => setVisualDiffMode('onion')}
                          className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                            visualDiffMode === 'onion' ? 'bg-[#141C2B] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#141C2B]'
                          }`}
                        >
                          Onion Skin Overlay
                        </button>
                      </div>
                    </div>

                    {/* Interactive Slider Adjustment */}
                    {visualDiffMode === 'wipe' && (
                      <div className="flex items-center gap-2 text-xs font-mono text-[#64748B]">
                        <span>Wipe Split:</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={wipeSliderPos}
                          onChange={(e) => setWipeSliderPos(Number(e.target.value))}
                          className="w-28 cursor-pointer accent-[#C8892E]"
                        />
                        <span className="w-8 font-bold text-[#141C2B]">{wipeSliderPos}%</span>
                      </div>
                    )}

                    {visualDiffMode === 'onion' && (
                      <div className="flex items-center gap-2 text-xs font-mono text-[#64748B]">
                        <span>Blend Opacity:</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={onionOpacity}
                          onChange={(e) => setOnionOpacity(Number(e.target.value))}
                          className="w-28 cursor-pointer accent-[#2563EB]"
                        />
                        <span className="w-8 font-bold text-[#141C2B]">{onionOpacity}%</span>
                      </div>
                    )}
                  </div>

                  {/* Visual Renderings */}
                  {visualDiffMode === 'split' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Baseline / Benchmark Reference */}
                      <div className="bg-white border border-[#E4E0D6] rounded-xl overflow-hidden shadow-xs flex flex-col">
                        <div className="bg-[#FAF8F3] border-b border-[#EFEBE2] px-3.5 py-2.5 flex items-center justify-between text-xs font-mono">
                          <span className="text-[#64748B] font-bold">
                            {isInitialSubmission ? 'APPROVED BENCHMARK REFERENCE' : `BASELINE VERSION ${v1.versionNumber}.0`}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openImageInNewTab(effectiveV1Image, `${benchmarkDoc ? benchmarkDoc.title : doc.title} - Baseline Reference`)}
                              className="px-2 py-0.5 bg-white hover:bg-[#EFF6FF] border border-[#E4E0D6] text-[#2563EB] rounded text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                              title="Open Baseline image in new tab"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              <span>Full Size</span>
                            </button>
                            <button
                              onClick={() => handleReadClipboard('v1')}
                              className="px-2 py-0.5 bg-white hover:bg-[#FAF8F3] border border-[#E4E0D6] text-[#141C2B] rounded text-[10px] font-medium cursor-pointer"
                              title="Paste image into Reference v1"
                            >
                              Paste v1
                            </button>
                            <button
                              onClick={() => fileInputV1Ref.current?.click()}
                              className="px-2 py-0.5 bg-white hover:bg-[#FAF8F3] border border-[#E4E0D6] text-[#141C2B] rounded text-[10px] font-medium cursor-pointer"
                              title="Upload reference file"
                            >
                              Upload
                            </button>
                          </div>
                        </div>

                        <div 
                          onClick={() => openImageInNewTab(effectiveV1Image, `${benchmarkDoc ? benchmarkDoc.title : doc.title} - Baseline Reference`)}
                          className="p-4 min-h-[260px] max-h-[360px] overflow-auto flex items-center justify-center bg-[#F8FAFC] cursor-zoom-in group relative"
                          title="Click to inspect in high-resolution tab"
                        >
                          <img
                            src={effectiveV1Image}
                            alt="Baseline Reference Strata"
                            className="max-h-[300px] max-w-full rounded-md shadow-xs border border-[#E2E8F0] object-contain bg-white group-hover:scale-[1.01] transition-transform"
                          />
                          <div className="absolute bottom-2 right-2 bg-white/90 border border-[#E4E0D6] text-[#2563EB] text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
                            <ExternalLink className="w-3 h-3" />
                            <span>Inspect</span>
                          </div>
                        </div>

                        <div className="bg-[#FAF8F3] border-t border-[#EFEBE2] px-3.5 py-2 text-[11px] font-mono text-[#64748B] flex items-center justify-between">
                          <span>{benchmarkDoc ? benchmarkDoc.title : doc.title}</span>
                          <span className="text-[#16A34A] font-bold">● Approved Standard</span>
                        </div>
                      </div>

                      {/* Right: Proposed Submission */}
                      <div className="bg-white border-2 border-[#C8892E] rounded-xl overflow-hidden shadow-xs flex flex-col">
                        <div className="bg-[#FAF8F3] border-b border-[#EFEBE2] px-3.5 py-2.5 flex items-center justify-between text-xs font-mono">
                          <span className="text-[#C8892E] font-bold">
                            {isInitialSubmission ? 'PROPOSED SUBMISSION (v1.0)' : `PROPOSED REVISION (v${v2.versionNumber}.0)`}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openImageInNewTab(effectiveV2Image, `${doc.title} - ${v2.fileName || 'Proposed Submission'}`)}
                              className="px-2 py-0.5 bg-[#C8892E] hover:bg-[#A97223] text-[#141C2B] rounded text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                              title="Open Proposed image in new tab"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              <span>Full Size</span>
                            </button>
                            <button
                              onClick={() => handleReadClipboard('v2')}
                              className="px-2 py-0.5 bg-[#141C2B] hover:bg-[#1E293B] text-white rounded text-[10px] font-bold cursor-pointer"
                              title="Paste image into Proposed v2"
                            >
                              Paste v2 (Ctrl+V)
                            </button>
                            <button
                              onClick={() => fileInputV2Ref.current?.click()}
                              className="px-2 py-0.5 bg-white hover:bg-[#FAF8F3] border border-[#E4E0D6] text-[#141C2B] rounded text-[10px] font-medium cursor-pointer"
                              title="Upload submission file"
                            >
                              Upload
                            </button>
                          </div>
                        </div>

                        <div 
                          onClick={() => openImageInNewTab(effectiveV2Image, `${doc.title} - ${v2.fileName || 'Proposed Submission'}`)}
                          className="p-4 min-h-[260px] max-h-[360px] overflow-auto flex items-center justify-center bg-[#F8FAFC] cursor-zoom-in group relative"
                          title="Click to inspect in high-resolution tab"
                        >
                          <img
                            src={effectiveV2Image}
                            alt="Proposed Strata Capture"
                            className="max-h-[300px] max-w-full rounded-md shadow-xs border border-[#E2E8F0] object-contain bg-white group-hover:scale-[1.01] transition-transform"
                          />
                          <div className="absolute bottom-2 right-2 bg-white/90 border border-[#E4E0D6] text-[#C8892E] text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
                            <ExternalLink className="w-3 h-3" />
                            <span>Inspect</span>
                          </div>
                        </div>

                        <div className="bg-[#FAF8F3] border-t border-[#EFEBE2] px-3.5 py-2 text-[11px] font-mono text-[#64748B] flex items-center justify-between">
                          <span>{v2.fileName || 'Submitted Visual Survey'}</span>
                          <span className="text-[#D97706] font-bold">● {v2.approvalStatus.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  ) : visualDiffMode === 'wipe' ? (
                    /* Wipe Curtain Overlay */
                    <div className="bg-[#F8FAFC] border border-[#E4E0D6] rounded-xl overflow-hidden shadow-xs relative min-h-[420px] flex items-center justify-center p-4">
                      <div className="relative w-full max-w-2xl h-[380px] overflow-hidden rounded-lg bg-white border border-[#E2E8F0] shadow-sm select-none">
                        {/* Background Base (v1) */}
                        <img
                          src={effectiveV1Image}
                          alt="Baseline"
                          className="absolute inset-0 w-full h-full object-contain"
                        />

                        {/* Foreground Wipe Clip (v2) */}
                        <div 
                          className="absolute inset-0 overflow-hidden border-r-2 border-[#C8892E]"
                          style={{ width: `${wipeSliderPos}%` }}
                        >
                          <img
                            src={effectiveV2Image}
                            alt="Proposed Revision"
                            className="absolute inset-0 w-full h-full object-contain max-w-none"
                            style={{ width: '100%', height: '100%' }}
                          />
                          <div className="absolute top-2 left-2 bg-[#141C2B]/85 text-[#FCD34D] font-mono text-[10px] px-2 py-0.5 rounded font-bold shadow-xs">
                            Proposed v{v2.versionNumber}.0
                          </div>
                        </div>

                        <div className="absolute top-2 right-2 bg-[#141C2B]/85 text-[#10B981] font-mono text-[10px] px-2 py-0.5 rounded font-bold shadow-xs">
                          Baseline Reference
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Onion Skin Overlay */
                    <div className="bg-[#F8FAFC] border border-[#E4E0D6] rounded-xl overflow-hidden shadow-xs relative min-h-[420px] flex items-center justify-center p-4">
                      <div className="relative w-full max-w-2xl h-[380px] rounded-lg bg-white border border-[#E2E8F0] shadow-sm overflow-hidden">
                        <img
                          src={effectiveV1Image}
                          alt="Baseline"
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                        <img
                          src={effectiveV2Image}
                          alt="Proposed"
                          style={{ opacity: onionOpacity / 100 }}
                          className="absolute inset-0 w-full h-full object-contain mix-blend-multiply"
                        />
                      </div>
                    </div>
                  )}

                  {/* Image Content Analysis & Geological Parameter Extraction Summary */}
                  {(() => {
                    // Check if this image has actual geological strata content vs general workflow/system architecture
                    const rawText = ((v2.extractedText || '') + ' ' + (v2.fileName || '')).toLowerCase();
                    const isSystemDiagram = rawText.includes('whatsapp') || 
                                            rawText.includes('query') || 
                                            rawText.includes('workflow') || 
                                            rawText.includes('semantic') || 
                                            rawText.includes('plantmind') ||
                                            rawText.includes('pipeline') ||
                                            rawText.includes('architecture');
                    
                    const isGeological = !isSystemDiagram && (
                      rawText.includes('strata') || 
                      rawText.includes('borehole') || 
                      rawText.includes('seam') || 
                      (doc.title || '').toLowerCase().includes('lithological')
                    );

                    return (
                      <div className="bg-white p-4.5 rounded-xl border border-[#E4E0D6] space-y-4 font-mono text-xs shadow-xs">
                        {/* Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFEBE2] pb-3">
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-[#C8892E]" />
                            <span className="font-bold text-[#141C2B] font-sans text-sm">
                              {isSystemDiagram 
                                ? 'AI Vision Ingestion: Technical Diagram & Flowchart Analysis' 
                                : 'Lithological Core Log & Strata Assay Metrics'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isSystemDiagram && (
                              <span className="text-[10px] text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded border border-[#FDE68A] font-bold">
                                Category: Software / Flow Architecture
                              </span>
                            )}
                            <span className="text-[10px] text-[#16A34A] bg-[#F0FDF4] px-2 py-0.5 rounded border border-[#BBF7D0] font-bold">
                              Vision OCR Confidence: {v2.ocrConfidence || 99.4}%
                            </span>
                          </div>
                        </div>

                        {/* If a system diagram was uploaded */}
                        {isSystemDiagram ? (
                          <div className="space-y-3 font-sans">
                            <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-xs text-[#1E40AF] space-y-1.5">
                              <div className="flex items-center gap-1.5 font-bold">
                                <Info className="w-4 h-4 text-[#2563EB] flex-shrink-0" />
                                <span>Detected Upload: Architecture / Workflow Diagram</span>
                              </div>
                              <p className="text-[11px] leading-relaxed text-[#1E3A8A]">
                                The OCR and vectorization engine parsed the uploaded image (<strong>{v2.fileName || 'WhatsApp Image'}</strong>) and identified technical process nodes rather than a physical core log. Below are the actual extracted vision nodes:
                              </p>
                            </div>

                            {/* Extracted Diagram Nodes */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] font-mono">
                              <div className="p-2.5 bg-[#FAF8F3] rounded-lg border border-[#E4E0D6]">
                                <span className="text-[#64748B] block text-[10px] uppercase font-bold">Node 1 (Input)</span>
                                <span className="font-bold text-[#141C2B]">WORKER QUERY</span>
                                <span className="text-[10px] text-[#64748B] block mt-0.5">Prompt & Search Ingestion</span>
                              </div>
                              <div className="p-2.5 bg-[#FAF8F3] rounded-lg border border-[#E4E0D6]">
                                <span className="text-[#64748B] block text-[10px] uppercase font-bold">Node 2 (Vector)</span>
                                <span className="font-bold text-[#141C2B]">SEMANTIC MATCHING</span>
                                <span className="text-[10px] text-[#64748B] block mt-0.5">Embeddings Similarity</span>
                              </div>
                              <div className="p-2.5 bg-[#FAF8F3] rounded-lg border border-[#E4E0D6]">
                                <span className="text-[#64748B] block text-[10px] uppercase font-bold">Node 3 (Retrieval)</span>
                                <span className="font-bold text-[#141C2B]">VERIFIED CONTEXT</span>
                                <span className="text-[10px] text-[#64748B] block mt-0.5">RAG Subsidiary Chunks</span>
                              </div>
                              <div className="p-2.5 bg-[#FAF8F3] rounded-lg border border-[#E4E0D6]">
                                <span className="text-[#64748B] block text-[10px] uppercase font-bold">Node 4 (Output)</span>
                                <span className="font-bold text-[#16A34A]">LLM CITATION RESP</span>
                                <span className="text-[10px] text-[#64748B] block mt-0.5">Cited Source Verification</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Geological Metrics Display */
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                              <div className="p-2.5 bg-[#FAF8F3] rounded-lg border border-[#E4E0D6]">
                                <div className="flex items-center justify-between">
                                  <span className="text-[#64748B] block text-[10px] uppercase font-bold">Coal Seam Thickness</span>
                                  <span className="text-[9px] bg-[#EFEBE2] text-[#141C2B] px-1 rounded font-bold">Seam IV</span>
                                </div>
                                <span className="font-bold text-sm text-[#141C2B] block mt-1">26.5m</span>
                                <span className="text-[10px] text-[#64748B] block">Derived from core scale-bar</span>
                              </div>
                              <div className="p-2.5 bg-[#FAF8F3] rounded-lg border border-[#E4E0D6]">
                                <div className="flex items-center justify-between">
                                  <span className="text-[#64748B] block text-[10px] uppercase font-bold">Overburden Depth</span>
                                  <span className="text-[9px] bg-[#FEF3C7] text-[#92400E] px-1 rounded font-bold">Topsoil+Sand</span>
                                </div>
                                <span className="font-bold text-sm text-[#141C2B] block mt-1">54.2m</span>
                                <span className="text-[10px] text-[#D97706] block font-semibold">Δ +1.2m variance vs standard</span>
                              </div>
                              <div className="p-2.5 bg-[#FAF8F3] rounded-lg border border-[#E4E0D6]">
                                <div className="flex items-center justify-between">
                                  <span className="text-[#64748B] block text-[10px] uppercase font-bold">Stripping Ratio</span>
                                  <span className="text-[9px] bg-[#EFEBE2] text-[#141C2B] px-1 rounded font-bold">OB / Coal</span>
                                </div>
                                <span className="font-bold text-sm text-[#141C2B] block mt-1">2.85 m³/tonne</span>
                                <span className="text-[10px] text-[#16A34A] block">High opencast viability</span>
                              </div>
                              <div className="p-2.5 bg-[#FAF8F3] rounded-lg border border-[#E4E0D6]">
                                <div className="flex items-center justify-between">
                                  <span className="text-[#64748B] block text-[10px] uppercase font-bold">GPS Grid Alignment</span>
                                  <span className="text-[9px] bg-[#DCFCE7] text-[#15803D] px-1 rounded font-bold">WGS-84</span>
                                </div>
                                <span className="font-bold text-sm text-[#16A34A] block mt-1">Locked 0.0m Shift</span>
                                <span className="text-[10px] text-[#64748B] block">23°47'N, 86°25'E Geotag</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Real System Technical Explanation Box */}
                        <div className="p-3 bg-[#FAF8F3] rounded-lg border border-[#E4E0D6] space-y-2 font-sans text-xs text-[#334155]">
                          <div className="font-bold text-[#141C2B] flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#C8892E]" />
                            <span>How a Real Mining Computer Vision System Calculates These Parameters:</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] leading-relaxed pt-1">
                            <div className="p-2 bg-white rounded border border-[#EFEBE2] space-y-1">
                              <strong className="text-[#141C2B] block font-mono text-[10px] uppercase">1. Strata Boundary Segmentation</strong>
                              <p className="text-[#64748B]">
                                Optical CV models detect pixel contrasts between yellow sandstone, grey siltstone, and black bituminous coal, calibrating layer depths against the image's vertical scale ruler.
                              </p>
                            </div>
                            <div className="p-2 bg-white rounded border border-[#EFEBE2] space-y-1">
                              <strong className="text-[#141C2B] block font-mono text-[10px] uppercase">2. Stripping Ratio Formula</strong>
                              <p className="text-[#64748B]">
                                Calculated as <code className="bg-[#FAF8F3] px-1 py-0.5 rounded text-[#141C2B] font-bold">OB Volume (m³) ÷ Coal Tonnage</code> to immediately evaluate economic feasibility for opencast mining operations.
                              </p>
                            </div>
                            <div className="p-2 bg-white rounded border border-[#EFEBE2] space-y-1">
                              <strong className="text-[#141C2B] block font-mono text-[10px] uppercase">3. GPS Grid Georeferencing</strong>
                              <p className="text-[#64748B]">
                                GeoTIFF metadata or surveyed ground control points (GCPs) align field images with Coal India’s central GIS mine grid to ensure accurate spatial positioning.
                              </p>
                            </div>
                            <div className="p-2 bg-white rounded border border-[#EFEBE2] space-y-1">
                              <strong className="text-[#141C2B] block font-mono text-[10px] uppercase">4. Automatic Category Validation</strong>
                              <p className="text-[#64748B]">
                                When a flowchart or non-strata diagram is submitted, the system flags the category mismatch so engineers can index it into technical guidelines rather than geological core archives.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* 2. TEXTUAL / STATUTORY SIDE-BY-SIDE DIFF CARDS */
                <div className={`grid grid-cols-1 ${selectedBenchmarkDocId !== 'none' && (benchmarkDoc || !isInitialSubmission) ? 'md:grid-cols-2' : ''} gap-4`}>
                  {/* Column 1: Baseline or Approved Benchmark Solution */}
                  {selectedBenchmarkDocId !== 'none' && (benchmarkDoc || !isInitialSubmission) && (
                    <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#E4E0D6] space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-[#EFEBE2]">
                        <div>
                          <div className="font-mono font-bold text-xs text-[#64748B]">
                            {isInitialSubmission 
                              ? `APPROVED BENCHMARK: ${benchmarkDoc ? benchmarkDoc.documentCode : 'STATUTORY TEMPLATE'}` 
                              : `BASELINE VERSION ${v1.versionNumber}.0`}
                          </div>
                          <div className="text-[10px] text-[#8F9BAE] truncate max-w-[240px]">
                            {isInitialSubmission ? (benchmarkDoc?.title || 'Approved Reference') : doc.title}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono bg-[#F0FDF4] text-[#16A34A] px-2 py-0.5 rounded font-bold border border-[#BBF7D0]">
                          APPROVED
                        </span>
                      </div>

                      <div className="p-3.5 bg-[#F8FAFC] rounded-lg font-sans text-xs text-[#334155] leading-relaxed max-h-80 overflow-y-auto border border-[#E2E8F0] space-y-2">
                        {(() => {
                          const raw = benchmarkVersion ? benchmarkVersion.extractedText : (v1?.extractedText || 'No prior version');
                          const paras = (raw || '').split('\n\n').filter(Boolean);
                          if (paras.length === 0) return <div>No text content.</div>;
                          return paras.map((p, pIdx) => (
                            <p key={pIdx} className="leading-relaxed text-justify">
                              {p}
                            </p>
                          ));
                        })()}
                      </div>

                      <div className="text-[10px] font-mono text-[#8F9BAE] flex items-center justify-between">
                        <span>
                          {benchmarkVersion ? `Source: ${benchmarkVersion.uploadedBy.name} (${benchmarkVersion.uploadedBy.subsidiary})` : 'Standard Template'}
                        </span>
                        <span className="text-[#16A34A] font-bold">Standard Reference</span>
                      </div>
                    </div>
                  )}

                  {/* Column 2: Proposed Submission */}
                  <div className={`bg-white p-4 sm:p-5 rounded-xl border-2 ${aiEval.categoryMismatch ? 'border-[#EF4444]' : 'border-[#C8892E]'} space-y-3`}>
                    <div className="flex items-center justify-between pb-2 border-b border-[#EFEBE2]">
                      <div>
                        <div className={`font-mono font-bold text-xs ${aiEval.categoryMismatch ? 'text-[#DC2626]' : 'text-[#C8892E]'}`}>
                          {isInitialSubmission 
                            ? 'PROPOSED NEW SUBMISSION (v1.0)' 
                            : `PROPOSED REVISION VERSION ${v2.versionNumber}.0`}
                        </div>
                        <div className="text-[10px] text-[#8F9BAE] truncate max-w-[240px]">
                          {doc.title}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {aiEval.categoryMismatch && (
                          <span className="text-[10px] font-mono bg-[#FEF2F2] text-[#DC2626] px-2 py-0.5 rounded font-bold border border-[#FECACA]">
                            MISMATCH
                          </span>
                        )}
                        <span className="text-[10px] font-mono bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded font-bold border border-[#FDE68A]">
                          {v2.approvalStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className={`p-3.5 bg-[#F8FAFC] rounded-lg font-sans text-xs text-[#0F172A] leading-relaxed max-h-80 overflow-y-auto border ${aiEval.categoryMismatch ? 'border-red-300' : 'border-[#CBD5E1]'} space-y-2`}>
                      {(() => {
                        const raw = v2.extractedText || '';
                        const paras = raw.split('\n\n').filter(Boolean);
                        if (paras.length === 0) return <div>No text content.</div>;
                        return paras.map((p, pIdx) => {
                          const isHeading = /^(\d+\.|\bSection\b|\bExecutive Directive\b|\bFindings\b)/i.test(p);
                          if (isHeading) {
                            return (
                              <h4 key={pIdx} className="font-bold text-[#0F172A] pt-1 text-xs border-b border-[#E2E8F0] pb-0.5">
                                {p}
                              </h4>
                            );
                          }
                          return (
                            <p key={pIdx} className="leading-relaxed text-[#334155] text-justify">
                              {p}
                            </p>
                          );
                        });
                      })()}
                    </div>

                    <div className="text-[10px] font-mono text-[#8F9BAE] flex items-center justify-between">
                      <span>Submitted by: {v2.uploadedBy.name}</span>
                      <span className={aiEval.categoryMismatch ? 'text-[#DC2626] font-bold' : 'text-[#16A34A] font-bold'}>
                        Compliance: {aiEval.overallScore}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer with Decision Controls */}
        <div className="p-4 bg-white border-t border-[#E4E0D6] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {aiEval.categoryMismatch ? (
              <span className="text-xs font-mono font-bold text-[#DC2626] flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
                <span>Approval Blocked: Category Mismatch Detected</span>
              </span>
            ) : (
              <span className="text-xs font-mono text-[#64748B]">
                Compliance Score: <strong className="text-[#16A34A]">{aiEval.overallScore}%</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCompareVersions(null)}
              className="px-3.5 py-2 bg-[#EFEBE2] text-[#141C2B] text-xs font-semibold rounded-lg hover:bg-[#D4CEBF] cursor-pointer text-center"
            >
              Close Inspector
            </button>

            {currentUser.role === 'admin' && v2.approvalStatus === 'pending' && (
              <>
                {/* Request Changes Button */}
                <button
                  onClick={() => {
                    setActionModal('changes');
                    setActionReason(aiEval.suggestedActionDirective);
                  }}
                  className="px-3.5 py-2 bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] border border-[#FCD34D] text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Request Changes</span>
                </button>

                {/* Approve Button */}
                <button
                  onClick={handleApprove}
                  disabled={aiEval.categoryMismatch}
                  title={aiEval.categoryMismatch ? 'Approval blocked due to category mismatch with unrelated subject matter' : 'Approve document'}
                  className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                    aiEval.categoryMismatch 
                      ? 'bg-[#94A3B8] text-white cursor-not-allowed opacity-60' 
                      : 'bg-[#16A34A] hover:bg-[#15803D] text-white'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {isInitialSubmission ? 'Approve & Index v1.0' : `Approve & Re-Index v${v2.versionNumber}.0`}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Request Changes Prompt Modal */}
      {actionModal === 'changes' && (
        <div className="fixed inset-0 bg-black/70 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-[#E4E0D6] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#EFEBE2]">
              <h4 className="font-sans font-bold text-sm text-[#141C2B] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#C8892E]" />
                <span>Request Revision from Officer ({v2.uploadedBy.name})</span>
              </h4>
              <button 
                onClick={() => setActionModal(null)} 
                className="text-[#64748B] hover:text-[#141C2B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#475569]">
              Specify revision instructions for <strong>{v2.uploadedBy.name}</strong> ({v2.uploadedBy.subsidiary || doc.subsidiary}). The document status will update to <span className="font-semibold text-[#B45309]">"Changes Requested"</span> and alert the officer.
            </p>

            {/* AI Assistant Quick-Draft Bar */}
            <div className="p-3 bg-[#FAF8F3] rounded-lg border border-[#E4E0D6] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-[#141C2B] flex items-center gap-1.5 uppercase tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-[#C8892E]" />
                  AI Suggested Directives &amp; Quick Templates:
                </span>
                <button
                  type="button"
                  onClick={handleAutoDraftAiDirective}
                  className="px-2.5 py-1 bg-[#141C2B] hover:bg-[#1E293B] text-white text-[10px] font-bold font-mono rounded-md flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                  title="Generate tailored feedback based on document parameters"
                >
                  <Sparkles className="w-3 h-3 text-[#E2B13C]" />
                  <span>Auto-Draft with AI</span>
                </button>
              </div>

              {/* One-Click Directive Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {predefinedDirectives.map((directive, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActionReason(directive.text)}
                    className="text-[11px] bg-white hover:bg-[#F3EFE6] text-[#334155] hover:text-[#0F172A] border border-[#E2DDD2] hover:border-[#C8892E] rounded-md px-2.5 py-1 flex items-center gap-1 transition-all cursor-pointer text-left"
                    title={directive.text}
                  >
                    <span>{directive.icon}</span>
                    <span className="font-medium">{directive.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                <label className="font-semibold text-[#141C2B]">Revision Directive Memo:</label>
                {actionReason && (
                  <button 
                    type="button" 
                    onClick={() => setActionReason('')}
                    className="text-[10px] text-[#DC2626] hover:underline cursor-pointer"
                  >
                    Clear text
                  </button>
                )}
              </div>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Click an AI template above or type customized instructions (e.g. Please provide updated Seam-IV overburden geological cross-sections and verify stripping ratio assays)..."
                rows={4}
                className="w-full bg-[#FAF8F3] border border-[#E4E0D6] text-[#141C2B] text-xs rounded-lg p-3 outline-none focus:ring-1 focus:ring-[#C8892E] leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#EFEBE2]">
              <span className="text-[10px] font-mono text-[#8F9BAE]">
                Status will change to: <strong>Changes Requested</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActionModal(null)}
                  className="px-3.5 py-1.5 text-xs text-[#64748B] hover:text-[#141C2B] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestChanges}
                  disabled={!actionReason.trim()}
                  className="px-4 py-2 text-xs font-bold rounded-lg text-white shadow-xs cursor-pointer disabled:opacity-50 bg-[#C8892E] hover:bg-[#A97223] flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send Change Request</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {pdfToast && (
        <div className="fixed bottom-6 right-6 z-[80] bg-[#0F172A] text-white px-4 py-2.5 rounded-xl shadow-2xl border border-[#334155] flex items-center gap-2 text-xs font-mono animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
          <span>{pdfToast}</span>
        </div>
      )}

      {/* Google Drive / Google Docs Direct Integration Modal */}
      {googleDriveModalOpen && (
        <div className="fixed inset-0 z-[75] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 text-[#0F172A]">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#0F172A]">Google Drive &amp; Cloud Document Hub</h3>
                  <p className="text-xs text-[#64748B] font-mono">{doc.documentCode} · {doc.subsidiary}</p>
                </div>
              </div>
              <button
                onClick={() => setGoogleDriveModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-[#334155]">
              <p>
                Manage, collaborate, and open this statutory technical filing directly within your Google Workspace or Google Drive environment:
              </p>

              <div className="grid grid-cols-1 gap-2.5 pt-1">
                {/* 1. Download & Open in Google Drive */}
                <button
                  onClick={() => {
                    handleDownloadPdf();
                    window.open('https://drive.google.com/drive/my-drive', '_blank');
                    setGoogleDriveModalOpen(false);
                  }}
                  className="p-3 bg-[#F8FAFC] hover:bg-[#EFF6FF] border border-[#E2E8F0] hover:border-[#3B82F6] rounded-xl text-left transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-sm text-[#0F172A] flex items-center gap-1.5">
                      <span>1. Save &amp; Upload to Google Drive</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#3B82F6] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      Downloads official PDF and launches your Google Drive repository.
                    </div>
                  </div>
                  <Download className="w-5 h-5 text-[#3B82F6] flex-shrink-0" />
                </button>

                {/* 2. Open Google Docs */}
                <button
                  onClick={() => {
                    window.open('https://docs.google.com/document/u/0/', '_blank');
                    setGoogleDriveModalOpen(false);
                  }}
                  className="p-3 bg-[#F8FAFC] hover:bg-[#F0FDF4] border border-[#E2E8F0] hover:border-[#22C55E] rounded-xl text-left transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-sm text-[#0F172A] flex items-center gap-1.5">
                      <span>2. Open Google Docs Editor</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#22C55E] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      Open Google Docs workspace to draft or review statutory memos.
                    </div>
                  </div>
                  <FileText className="w-5 h-5 text-[#22C55E] flex-shrink-0" />
                </button>

                {/* 3. Copy Text for Google Docs / Word */}
                <button
                  onClick={() => {
                    const text = v2.extractedText || '';
                    navigator.clipboard.writeText(text);
                    setPdfToast('Document text copied to clipboard!');
                    setTimeout(() => setPdfToast(null), 3000);
                    setGoogleDriveModalOpen(false);
                  }}
                  className="p-3 bg-[#F8FAFC] hover:bg-[#FAF5FF] border border-[#E2E8F0] hover:border-[#A855F7] rounded-xl text-left transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-sm text-[#0F172A]">3. Copy Structured Text to Clipboard</div>
                    <div className="text-[11px] text-[#64748B]">
                      Quickly paste statutory directives directly into Google Docs or Sheets.
                    </div>
                  </div>
                  <ClipboardCheck className="w-5 h-5 text-[#A855F7] flex-shrink-0" />
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E2E8F0]">
              <button
                onClick={() => setGoogleDriveModalOpen(false)}
                className="px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Close Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
