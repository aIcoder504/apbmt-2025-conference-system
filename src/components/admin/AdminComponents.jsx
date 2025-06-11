// src/components/admin/AdminComponents.jsx - COMPLETE FIXED VERSION WITH INDIVIDUAL BUTTONS
'use client';

import { useState } from 'react';

// 🎯 ENHANCED TOAST NOTIFICATION SYSTEM
const showToast = (message, type = 'success', duration = 8000) => {
  // Remove any existing toasts first
  const existingToasts = document.querySelectorAll('.custom-toast');
  existingToasts.forEach(toast => {
    if (document.body.contains(toast)) {
      document.body.removeChild(toast);
    }
  });

  const toast = document.createElement('div');
  toast.className = 'custom-toast fixed top-4 right-4 z-50 max-w-md animate-bounce';
  
  const bgColor = {
    'success': 'bg-green-500',
    'error': 'bg-red-500',
    'warning': 'bg-yellow-500',
    'info': 'bg-blue-500'
  }[type] || 'bg-green-500';

  toast.innerHTML = `
    <div class="${bgColor} text-white p-6 rounded-lg shadow-2xl border-l-4 border-white">
      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0">
          ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-lg font-bold mb-2">
            ${type === 'success' ? 'Success!' : type === 'error' ? 'Error!' : type === 'warning' ? 'Warning!' : 'Info'}
          </div>
          <div class="text-sm whitespace-pre-wrap">${message}</div>
        </div>
        <button 
          onclick="this.closest('.custom-toast').remove()" 
          class="text-white hover:text-gray-200 text-xl font-bold ml-4 flex-shrink-0"
          title="Close"
        >
          ×
        </button>
      </div>
      <div class="mt-4 flex justify-end">
        <button 
          onclick="this.closest('.custom-toast').remove()" 
          class="${bgColor} hover:opacity-80 text-white px-4 py-2 rounded font-medium text-sm border border-white border-opacity-30"
        >
          Close
        </button>
      </div>
    </div>
  `;

  // Add to body
  document.body.appendChild(toast);

  // Auto-remove after duration
  setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.style.transition = 'all 0.5s ease-out';
      toast.style.transform = 'translateX(100%)';
      toast.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 500);
    }
  }, duration);

  return toast;
};

// 🚀 FIXED EMAIL INTEGRATION - CORRECT ENDPOINT
export const EmailIntegration = {
  // Fixed send email function with correct endpoint
  sendEmail: async (abstract, emailType = 'status_update') => {
    try {
      console.log('🔄 Sending email to:', abstract.email, 'Type:', emailType);
      
      // ✅ FIXED: Correct endpoint /api/abstracts/email
      const response = await fetch('/api/abstracts/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: emailType,
          data: {
            email: abstract.email || abstract.mobile_no,
            name: abstract.author || abstract.presenter_name,
            title: abstract.title || abstract.abstract_title,
            abstractId: abstract.id,
            status: abstract.status,
            category: abstract.category || abstract.presentation_type,
            institution: abstract.affiliation || abstract.institution_name,
            submissionId: abstract.abstract_number || abstract.id,
            reviewDate: new Date().toISOString()
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showToast(`✅ Email sent successfully to ${abstract.email}!\n\nType: ${emailType}\nSubject: Abstract ${abstract.status.toUpperCase()}`, 'success');
        return true;
      } else {
        showToast(`❌ Email failed: ${result.error}\n\nEmail: ${abstract.email}\nCheck email configuration.`, 'error');
        return false;
      }
    } catch (error) {
      console.error('Email error:', error);
      showToast(`❌ Email error: ${error.message}\n\nCheck:\n1. Email API endpoint\n2. Internet connection\n3. Email configuration`, 'error');
      return false;
    }
  },

  // Fixed approval email with correct endpoint
  sendApprovalEmail: async (abstract) => {
    try {
      console.log('🔄 Sending approval email to:', abstract.email);
      
      const response = await fetch('/api/abstracts/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'status_update',
          data: {
            email: abstract.email || abstract.mobile_no,
            name: abstract.author || abstract.presenter_name,
            title: abstract.title || abstract.abstract_title,
            abstractId: abstract.id,
            status: 'approved',
            category: abstract.category || abstract.presentation_type,
            institution: abstract.affiliation || abstract.institution_name,
            submissionId: abstract.abstract_number || abstract.id,
            reviewDate: new Date().toISOString(),
            comments: 'Your abstract has been approved for presentation.'
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showToast(`✅ Approval email sent successfully!\n\nTo: ${abstract.email}\nAbstract: ${abstract.title}`, 'success');
        return true;
      } else {
        showToast(`❌ Approval email failed: ${result.error}`, 'error');
        return false;
      }
    } catch (error) {
      showToast(`❌ Approval email error: ${error.message}`, 'error');
      return false;
    }
  },

  // Fixed rejection email with correct endpoint
  sendRejectionEmail: async (abstract, comments = '') => {
    try {
      console.log('🔄 Sending rejection email to:', abstract.email);
      
      const response = await fetch('/api/abstracts/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'status_update',
          data: {
            email: abstract.email || abstract.mobile_no,
            name: abstract.author || abstract.presenter_name,
            title: abstract.title || abstract.abstract_title,
            abstractId: abstract.id,
            status: 'rejected',
            category: abstract.category || abstract.presentation_type,
            institution: abstract.affiliation || abstract.institution_name,
            submissionId: abstract.abstract_number || abstract.id,
            reviewDate: new Date().toISOString(),
            comments: comments || 'Please review and improve your abstract for future submissions.'
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showToast(`✅ Rejection email sent!\n\nTo: ${abstract.email}\nComments included: ${comments ? 'Yes' : 'Standard message'}`, 'success');
        return true;
      } else {
        showToast(`❌ Rejection email failed: ${result.error}`, 'error');
        return false;
      }
    } catch (error) {
      showToast(`❌ Rejection email error: ${error.message}`, 'error');
      return false;
    }
  },

  // 🚀 FIXED BULK EMAIL WITH CORRECT ENDPOINT
  sendBulkEmail: async (abstracts, emailType) => {
    if (abstracts.length === 0) {
      showToast('❌ No abstracts selected for bulk email', 'error');
      return;
    }

    const confirmed = confirm(`📧 Send ${emailType} emails to ${abstracts.length} recipients?\n\nThis will send individual emails to each selected abstract author.`);
    if (!confirmed) return;

    let successCount = 0;
    let failCount = 0;
    
    showToast(`🔄 Starting bulk email process...\nSending to ${abstracts.length} recipients\nPlease wait...`, 'info', 5000);

    for (const abstract of abstracts) {
      try {
        // ✅ FIXED: Use correct API endpoint
        const response = await fetch('/api/abstracts/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'status_update',
            data: {
              email: abstract.email || abstract.mobile_no,
              name: abstract.author || abstract.presenter_name,
              title: abstract.title || abstract.abstract_title,
              abstractId: abstract.id,
              status: abstract.status,
              category: abstract.category || abstract.presentation_type,
              institution: abstract.affiliation || abstract.institution_name,
              submissionId: abstract.abstract_number || abstract.id,
              reviewDate: new Date().toISOString()
            }
          })
        });

        const result = await response.json();
        
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
        
        // Small delay to prevent overwhelming the email service
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Bulk email error for:', abstract.email, error);
        failCount++;
      }
    }

    showToast(`📊 Bulk Email Results:\n\n✅ Successful: ${successCount}\n❌ Failed: ${failCount}\n📧 Total: ${abstracts.length}`, 'success', 10000);
  }
};

// ENHANCED EMAIL BUTTON COMPONENT
export const EmailActionButton = ({ abstract, buttonType = 'default', className = '' }) => {
  const handleEmailClick = async (e) => {
    e.stopPropagation(); // Prevent triggering parent click events
    
    switch (buttonType) {
      case 'approval':
        await EmailIntegration.sendApprovalEmail(abstract);
        break;
      case 'rejection':
        const comments = prompt('Enter rejection comments (optional):');
        await EmailIntegration.sendRejectionEmail(abstract, comments);
        break;
      case 'status':
        await EmailIntegration.sendEmail(abstract, 'status_update');
        break;
      default:
        await EmailIntegration.sendEmail(abstract, 'general');
    }
  };

  const getButtonText = () => {
    switch (buttonType) {
      case 'approval': return '✅ Approve';
      case 'rejection': return '❌ Reject';
      case 'status': return '📧 Email';
      default: return '📧 Email';
    }
  };

  const getButtonColor = () => {
    switch (buttonType) {
      case 'approval': return 'bg-green-600 hover:bg-green-700';
      case 'rejection': return 'bg-red-600 hover:bg-red-700';
      case 'status': return 'bg-orange-600 hover:bg-orange-700';
      default: return 'bg-orange-600 hover:bg-orange-700';
    }
  };

  return (
    <button
      onClick={handleEmailClick}
      className={`${getButtonColor()} text-white px-2 py-1 rounded text-xs transition-colors ${className}`}
      title={`Send ${buttonType} email to ${abstract.email}`}
    >
      {getButtonText()}
    </button>
  );
};

// 1. PRD SECTION 3.4.2 - Real-time Statistics Table (EXACT PRD FORMAT)
export const CategoryWiseStatisticsTable = ({ stats, categoryStats }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">📊 Real-time Statistics Table</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-4 py-3 text-left font-medium text-gray-700">Category</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-medium text-gray-700">Received</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-medium text-gray-700">Pending</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-medium text-gray-700">Approved</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-medium text-gray-700">Rejected</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 px-4 py-3 font-medium">Free Paper Presentation</td>
              <td className="border border-gray-300 px-4 py-3 text-center bg-blue-50 font-semibold text-blue-800">
                {categoryStats?.freePaper?.total || 0}
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center bg-yellow-50 text-yellow-800">
                {categoryStats?.freePaper?.pending || 0}
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center bg-green-50 text-green-800">
                {categoryStats?.freePaper?.approved || 0}
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center bg-red-50 text-red-800">
                {categoryStats?.freePaper?.rejected || 0}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-3 font-medium">Award Paper Presentation</td>
              <td className="border border-gray-300 px-4 py-3 text-center bg-blue-50 font-semibold text-blue-800">
                {categoryStats?.awardPaper?.total || 0}
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center bg-yellow-50 text-yellow-800">
                {categoryStats?.awardPaper?.pending || 0}
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center bg-green-50 text-green-800">
                {categoryStats?.awardPaper?.approved || 0}
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center bg-red-50 text-red-800">
                {categoryStats?.awardPaper?.rejected || 0}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-3 font-medium">Poster Presentation</td>
              <td className="border border-gray-300 px-4 py-3 text-center bg-blue-50 font-semibold text-blue-800">
                {categoryStats?.poster?.total || 0}
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center bg-yellow-50 text-yellow-800">
                {categoryStats?.poster?.pending || 0}
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center bg-green-50 text-green-800">
                {categoryStats?.poster?.approved || 0}
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center bg-red-50 text-red-800">
                {categoryStats?.poster?.rejected || 0}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-3 font-medium">E-Poster Presentation</td>
              <td className="border border-gray-300 px-4 py-3 text-center bg-blue-50 font-semibold text-blue-800">
                {categoryStats?.ePoster?.total || 0}
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center bg-yellow-50 text-yellow-800">
                {categoryStats?.ePoster?.pending || 0}
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center bg-green-50 text-green-800">
                {categoryStats?.ePoster?.approved || 0}
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center bg-red-50 text-red-800">
                {categoryStats?.ePoster?.rejected || 0}
              </td>
            </tr>
            <tr className="bg-gray-100 font-bold">
              <td className="border border-gray-300 px-4 py-3 font-bold text-gray-900">Total</td>
              <td className="border border-gray-300 px-4 py-3 text-center font-bold text-blue-900">
                {stats.total}
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center font-bold text-yellow-900">
                {stats.pending}
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center font-bold text-green-900">
                {stats.approved}
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center font-bold text-red-900">
                {stats.rejected}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 2. PRD SECTION 3.4.3 - Enhanced Abstract Review Interface WITH FIXED INDIVIDUAL BUTTONS
export const EnhancedAbstractTable = ({ 
  abstracts, 
  onSelectAbstract, 
  onUpdateStatus, 
  onSendEmail, 
  onDownload, 
  onApprove,        // ✅ FIXED: Add individual approve function
  onReject,         // ✅ FIXED: Add individual reject function
  handleBulkStatusUpdate,
  updatingStatus    // ✅ FIXED: Add loading state
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Multi-select state
  const [selectedAbstracts, setSelectedAbstracts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Multi-select functions
  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      const filteredAbstracts = getFilteredAbstracts();
      setSelectedAbstracts(filteredAbstracts.map(abstract => abstract.id));
    } else {
      setSelectedAbstracts([]);
    }
  };

  const handleSelectAbstract = (abstractId) => {
    setSelectedAbstracts(prev => {
      if (prev.includes(abstractId)) {
        const updated = prev.filter(id => id !== abstractId);
        setSelectAll(false);
        return updated;
      } else {
        const updated = [...prev, abstractId];
        const filteredAbstracts = getFilteredAbstracts();
        if (updated.length === filteredAbstracts.length) {
          setSelectAll(true);
        }
        return updated;
      }
    });
  };

  const getSelectedAbstractObjects = () => {
    return abstracts.filter(abstract => selectedAbstracts.includes(abstract.id));
  };

  const getFilteredAbstracts = () => {
    return abstracts.filter(abstract => {
      const matchesSearch = abstract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          abstract.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          abstract.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || abstract.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || abstract.status === statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  };

  // 🚀 FIXED BULK STATUS UPDATE WITH PROPER EMAIL INTEGRATION
  const handleInternalBulkStatusUpdate = async (status) => {
    const selected = getSelectedAbstractObjects();
    
    if (selected.length === 0) {
      showToast('❌ No abstracts selected\n\nPlease select abstracts using checkboxes first.', 'error');
      return;
    }

    const statusText = status === 'approved' ? 'APPROVE' : 'REJECT';
    const statusIcon = status === 'approved' ? '✅' : '❌';
    
    const confirmed = confirm(
      `${statusIcon} Bulk ${statusText} Confirmation\n\n` +
      `📊 Selected: ${selected.length} abstracts\n` +
      `🔄 Action: ${status.toUpperCase()}\n` +
      `📧 Emails: Will be sent to all presenters\n` +
      `💾 Database: Will be updated immediately\n\n` +
      `⚠️ This action cannot be undone.\n\n` +
      `Continue with bulk ${status}?`
    );
    
    if (!confirmed) {
      showToast(`❌ Bulk ${statusText} Cancelled\n\nNo changes were made.`, 'warning', 3000);
      return;
    }

    const loadingToast = showToast(
      `🔄 Processing Bulk ${statusText}...\n\n` +
      `📊 Total: ${selected.length} abstracts\n` +
      `⏳ Please wait while we update the database\n` +
      `📧 Emails will be sent after database update`,
      'info',
      30000
    );

    try {
      console.log('🔄 Starting bulk update for:', selected.map(a => a.id));
      
      const response = await fetch('/api/abstracts/bulk-update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({
          abstractIds: selected.map(abstract => abstract.id),
          status: status,
          updatedBy: 'admin',
          comments: `Bulk ${status} operation`,
          bulkOperation: true
        })
      });

      const updateResult = await response.json();
      console.log('📊 Database update result:', updateResult);

      if (document.body.contains(loadingToast)) {
        document.body.removeChild(loadingToast);
      }

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Database update failed');
      }

      if (updateResult.successful > 0) {
        showToast(
          `${statusIcon} Database Update Successful!\n\n` +
          `📊 Results:\n` +
          `• ✅ Updated: ${updateResult.successful} abstracts\n` +
          `• ❌ Failed: ${updateResult.failed}\n` +
          `• 📧 Sending emails now...\n\n` +
          `Please wait for email confirmation.`,
          'success',
          5000
        );

        // 🚀 FIXED: Send emails using correct API endpoint
        if (updateResult.successful > 0) {
          const emailToast = showToast(
            `📧 Sending Email Notifications...\n\n` +
            `📊 Total: ${updateResult.successful} emails\n` +
            `⏳ Please wait...`,
            'info',
            15000
          );

          try {
            // Use the dedicated bulk email API
            const emailResponse = await fetch('/api/abstracts/email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'bulk_status_update',
                abstractIds: selected.map(abstract => abstract.id),
                status: status,
                comments: `Bulk ${status} operation - Your abstract has been ${status}.`
              })
            });

            const emailResult = await emailResponse.json();

            if (document.body.contains(emailToast)) {
              document.body.removeChild(emailToast);
            }

            showToast(
              `🎉 Bulk ${statusText} Operation Complete!\n\n` +
              `📊 Database Updates:\n` +
              `• ✅ Successful: ${updateResult.successful}\n` +
              `• ❌ Failed: ${updateResult.failed}\n\n` +
              `📧 Email Notifications:\n` +
              `• ✅ Sent: ${emailResult.results?.emailsSent || 0}\n` +
              `• ❌ Failed: ${emailResult.results?.emailsTotal - emailResult.results?.emailsSent || 0}\n\n` +
              `💾 All changes saved to database\n` +
              `🔄 Page will refresh in 3 seconds`,
              'success',
              15000
            );

          } catch (emailError) {
            console.error('Bulk email error:', emailError);
            if (document.body.contains(emailToast)) {
              document.body.removeChild(emailToast);
            }
            
            showToast(
              `⚠️ Partial Success\n\n` +
              `💾 Database: ✅ Updated ${updateResult.successful} abstracts\n` +
              `📧 Emails: ❌ Failed to send\n\n` +
              `Database changes saved but emails failed.\n` +
              `You may need to send emails manually.`,
              'warning',
              10000
            );
          }
        }

        setSelectedAbstracts([]);
        setSelectAll(false);

        setTimeout(() => {
          window.location.reload();
        }, 2000);

      } else {
        throw new Error(updateResult.error || 'Update failed');
      }

    } catch (error) {
      const loadingToasts = document.querySelectorAll('.custom-toast');
      loadingToasts.forEach(toast => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      });

      console.error('❌ Bulk operation error:', error);
      
      showToast(
        `❌ Bulk ${statusText} Failed!\n\n` +
        `💥 Error: ${error.message}\n\n` +
        `🔍 Debug Info:\n` +
        `• Selected: ${selected.length} abstracts\n` +
        `• IDs: ${selected.map(a => a.id).join(', ')}\n` +
        `• Status: ${status}\n\n` +
        `🔧 Troubleshooting:\n` +
        `• Check internet connection\n` +
        `• Verify server is running\n` +
        `• Try refreshing the page\n` +
        `• Contact administrator if problem persists`,
        'error',
        20000
      );
    }
  };

  // Use external handleBulkStatusUpdate if provided, otherwise use internal
  const bulkUpdateFunction = handleBulkStatusUpdate || handleInternalBulkStatusUpdate;

  // Enhanced Bulk Export with Real Data
  const handleBulkExport = async () => {
    const selected = getSelectedAbstractObjects();
    
    if (selected.length === 0) {
      showToast('❌ No abstracts selected for export', 'error');
      return;
    }

    try {
      showToast(
        `🔄 Preparing export for ${selected.length} abstracts...\n\nPlease wait...`,
        'info',
        5000
      );

      const exportData = selected.map((abstract, index) => ({
        'Abstract No': abstract.abstract_number || `ABST-${String(index + 1).padStart(3, '0')}`,
        'Submission Date': formatDate(abstract.submission_date || abstract.submissionDate),
        'Presenter Name': abstract.presenter_name || abstract.author,
        'Email ID': abstract.email,
        'Mobile No': abstract.mobile || 'N/A',
        'Abstract Title': abstract.title,
        'Co-Author Name': abstract.co_authors || abstract.coAuthors || 'N/A',
        'Institution Name': abstract.institution || abstract.affiliation,
        'Registration ID': abstract.registration_number || abstract.registrationId || 'N/A',
        'Status': (abstract.status || 'pending').toUpperCase(),
        'Category': abstract.presentation_type || abstract.category,
        'Abstract Content': abstract.abstract_content || abstract.abstract || 'N/A'
      }));

      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header]?.toString() || '';
            return value.includes(',') || value.includes('"') 
              ? `"${value.replace(/"/g, '""')}"` 
              : value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `APBMT_Selected_Abstracts_${timestamp}_${selected.length}items.csv`;
        link.setAttribute('download', filename);
        
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
