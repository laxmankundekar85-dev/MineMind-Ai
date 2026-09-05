import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  FileText, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  ArrowUpRight, 
  Upload, 
  Search, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const { 
    currentUser, 
    documents, 
    queries, 
    setActiveView, 
    setActiveDocForDetail,
    setActiveCitationForModal,
    setSelectedSubsidiary
  } = useApp();

  // Filter documents contributed by or associated with this employee / subsidiary
  const myContributedDocs = documents.filter(doc => 
    doc.versions.some(v => v.uploadedBy.id === currentUser.id || v.uploadedBy.subsidiary === currentUser.subsidiary)
  );

  const myPendingUpdates = documents.reduce((acc, doc) => {
    const pendings = doc.versions.filter(v => 
      v.approvalStatus === 'pending' && 
      (v.uploadedBy.id === currentUser.id || v.uploadedBy.subsidiary === currentUser.subsidiary)
    );
    return acc + pendings.length;
  }, 0);

  const recentAiQueries = queries.slice(0, 4);

  return (
    <div id="employee-dashboard" className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      {/* Greeting Header & Personal Scope */}
      <div className="bg-white border border-[#D1DCE5] rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#D97706] font-bold uppercase tracking-wider mb-1">
            <span>CMPDI/CIL Technical Officer Workstation</span>
            <span>·</span>
            <span>{currentUser.subsidiary} Division</span>
          </div>
          <h2 className="font-sans font-bold text-xl sm:text-2xl text-[#0B2238]">
            Welcome, {currentUser.name}
          </h2>
          <p className="text-xs text-[#64748B] mt-1 font-medium max-w-2xl">
            {currentUser.designation} · {currentUser.department}. Grounded knowledge base is synchronized with the latest central governance index.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            id="btn-dash-upload-doc"
            onClick={() => setActiveView('knowledge')}
            className="px-4 py-2.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white transition-all text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Upload className="w-4 h-4 text-white" />
            <span>Upload Document</span>
          </button>
          <button
            id="btn-dash-ask-ai"
            onClick={() => setActiveView('ai-assistant')}
            className="px-4 py-2.5 rounded-xl bg-[#F0F4F8] text-[#00529B] border border-[#CBD5E1] hover:bg-[#E2E8F0] transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-[#00529B]" />
            <span>Ask AI Assistant</span>
          </button>
        </div>
      </div>

      {/* Scoped KPI Metric Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white border border-[#D1DCE5] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-medium">Contributed Documents</span>
            <FileText className="w-4 h-4 text-[#00529B]" />
          </div>
          <div className="font-sans font-bold text-3xl text-[#0B2238]">
            {myContributedDocs.length}
          </div>
          <div className="text-[11px] text-[#047857] font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#047857]" />
            <span>Active in knowledge base</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-[#D1DCE5] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-medium">Pending Revisions Submitted</span>
            <Clock className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="font-sans font-bold text-3xl text-[#0B2238]">
            {myPendingUpdates}
          </div>
          <div className="text-[11px] text-[#64748B] font-mono mt-1 font-medium">
            Under central directorate review
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-[#D1DCE5] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-medium">AI Queries Run This Week</span>
            <Sparkles className="w-4 h-4 text-[#00529B]" />
          </div>
          <div className="font-sans font-bold text-3xl text-[#0B2238]">
            {queries.length}
          </div>
          <div className="text-[11px] text-[#00529B] font-semibold mt-1">
            100% source cited responses
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white border border-[#D1DCE5] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-medium">Grounded Compliance Rate</span>
            <ShieldCheck className="w-4 h-4 text-[#047857]" />
          </div>
          <div className="font-sans font-bold text-3xl text-[#047857]">
            100%
          </div>
          <div className="text-[11px] text-[#64748B] font-mono mt-1 font-medium">
            Zero synthetic hallucination
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Documents & AI Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: My Recent Documents */}
        <div className="bg-white border border-[#D1DCE5] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="font-sans font-bold text-base text-[#0B2238]">
                  My Contributed Documents
                </h3>
                <p className="text-[11px] text-[#64748B] font-medium">
                  Governed technical filings from {currentUser.subsidiary}
                </p>
              </div>
              <button
                onClick={() => setActiveView('knowledge')}
                className="text-xs font-bold text-[#00529B] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All In Knowledge Center</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {myContributedDocs.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-[#CBD5E1] rounded-xl p-6 bg-[#F8FAFC]">
                <BookOpen className="w-8 h-8 text-[#64748B] mx-auto mb-2" />
                <p className="text-xs font-bold text-[#0B2238]">No documents contributed yet</p>
                <p className="text-[11px] text-[#64748B] mt-1 max-w-xs mx-auto">
                  Upload your first geological report, borehole log, or mine safety standard to seed the knowledge repository.
                </p>
                <button
                  onClick={() => setActiveView('knowledge')}
                  className="mt-3 px-3.5 py-2 bg-[#D97706] text-white rounded-xl text-xs font-bold hover:bg-[#B45309] transition-colors cursor-pointer shadow-xs"
                >
                  Upload First Document
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myContributedDocs.slice(0, 3).map((doc) => {
                  const currentVer = doc.versions.find(v => v.id === doc.currentVersionId) || doc.versions[0];
                  const hasPending = doc.versions.some(v => v.approvalStatus === 'pending');

                  return (
                    <div 
                      key={doc.id}
                      className="p-3.5 rounded-xl border border-[#CBD5E1] hover:border-[#00529B] transition-all bg-[#F8FAFC] flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono font-bold bg-[#E2E8F0] text-[#0B2238] px-2 py-0.5 rounded-md border border-[#CBD5E1]">
                            {doc.documentCode}
                          </span>
                          <span className="text-[10px] font-mono text-[#64748B] font-semibold">
                            v{currentVer.versionNumber}.0
                          </span>
                          {hasPending && (
                            <span className="text-[10px] font-mono font-bold bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded-full border border-[#FDE68A]">
                              Revision Pending
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-[#0B2238] truncate">
                          {doc.title}
                        </h4>
                        <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                          {currentVer.reasonForChange}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setActiveDocForDetail(doc);
                          setActiveView('knowledge');
                        }}
                        className="p-1.5 text-[#64748B] hover:text-[#00529B] hover:bg-white rounded-lg border border-transparent hover:border-[#CBD5E1] transition-colors flex-shrink-0 cursor-pointer"
                        title="View Version Timeline & Content"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
            <span className="font-medium">Version Lineage: Append-only</span>
            <span className="font-mono text-[11px] text-[#0B2238] font-bold">OCR Accuracy: 99.2%</span>
          </div>
        </div>

        {/* Right Column: AI Activity & Grounded Inquiries */}
        <div className="bg-white border border-[#D1DCE5] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="font-sans font-bold text-base text-[#0B2238]">
                  Recent AI Inquiries & Verified Answers
                </h3>
                <p className="text-[11px] text-[#64748B] font-medium">
                  Answers strictly sourced from approved CMPDI/CIL records
                </p>
              </div>
              <button
                onClick={() => setActiveView('ai-assistant')}
                className="text-xs font-bold text-[#00529B] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Open Assistant</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentAiQueries.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-[#CBD5E1] rounded-xl p-6 bg-[#F8FAFC]">
                <Sparkles className="w-8 h-8 text-[#64748B] mx-auto mb-2" />
                <p className="text-xs font-bold text-[#0B2238]">No AI queries asked yet</p>
                <p className="text-[11px] text-[#64748B] mt-1 max-w-xs mx-auto">
                  Ask technical questions about borehole reserves, slope stability angles, or DGMS safety norms.
                </p>
                <button
                  onClick={() => setActiveView('ai-assistant')}
                  className="mt-3 px-3.5 py-2 bg-[#00529B] text-white rounded-xl text-xs font-bold hover:bg-[#0B2238] transition-colors cursor-pointer shadow-xs"
                >
                  Start Grounded Query
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAiQueries.map((q) => (
                  <div 
                    key={q.id}
                    className="p-3.5 rounded-xl border border-[#CBD5E1] hover:border-[#00529B] transition-all bg-[#F8FAFC]"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-bold text-[#0B2238] line-clamp-1">
                        Q: {q.questionText}
                      </span>
                      {q.isStale ? (
                        <span className="text-[10px] font-mono font-bold bg-[#FEF2F2] text-[#DC2626] px-2 py-0.5 rounded-full border border-[#FECACA] flex-shrink-0">
                          Source Updated
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold bg-[#ECFDF5] text-[#047857] px-2 py-0.5 rounded-full border border-[#A7F3D0] flex-shrink-0">
                          {q.confidence.toFixed(1)}% Conf
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#334155] line-clamp-2 leading-relaxed bg-white p-2.5 rounded-lg border border-[#CBD5E1]">
                      {q.answerText}
                    </p>

                    {/* Source citation chip */}
                    {q.citations.length > 0 && (
                      <div className="mt-2 flex items-center justify-between">
                        <button
                          onClick={() => setActiveCitationForModal(q.citations[0])}
                          className="text-[10px] font-mono text-[#00529B] hover:underline flex items-center gap-1 truncate max-w-[80%] cursor-pointer"
                        >
                          <span>📄 {q.citations[0].documentTitle}</span>
                          <span className="text-[#64748B]">({q.citations[0].pageOrSheetRef})</span>
                        </button>
                        <button
                          onClick={() => setActiveView('ai-assistant')}
                          className="text-[10px] text-[#00529B] font-bold hover:underline cursor-pointer"
                        >
                          View Again →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
            <span className="font-medium">Real-time RAG Pipeline</span>
            <span className="text-[#047857] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#047857]" />
              Direct Chunk Grounding
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
