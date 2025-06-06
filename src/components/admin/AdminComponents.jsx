// src/components/admin/AdminComponents.jsx - COMPLETE FIXED VERSION WITH EMAIL
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

// 2. PRD SECTION 3.4.3 - Enhanced Abstract Review Interface WITH COMPLETE BULK OPERATIONS
export const EnhancedAbstractTable = ({ abstracts, onSelectAbstract, onUpdateStatus, onSendEmail, onDownload, handleBulkStatusUpdate }) => {
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

  // Individual status update with email
  const handleIndividualStatusUpdate = async (abstract, newStatus) => {
    const statusIcon = newStatus === 'approved' ? '✅' : '❌';
    const statusText = newStatus.toUpperCase();

    const confirmed = confirm(
      `${statusIcon} ${statusText} Confirmation\n\n` +
      `📝 Abstract: ${abstract.title}\n` +
      `👤 Author: ${abstract.author}\n` +
      `📧 Email: ${abstract.email}\n` +
      `🔄 New Status: ${statusText}\n\n` +
      `This will:\n` +
      `• Update status in database\n` +
      `• Send ${newStatus} email to presenter\n\n` +
      `Continue?`
    );

    if (!confirmed) {
      showToast(`❌ ${statusText} Cancelled\n\nNo changes made to "${abstract.title}"`, 'warning', 3000);
      return;
    }

    try {
      const loadingToast = showToast(
        `🔄 Updating Abstract...\n\n` +
        `📝 "${abstract.title}"\n` +
        `🔄 Status: ${statusText}\n` +
        `⏳ Please wait...`,
        'info',
        10000
      );

      const response = await fetch('/api/abstracts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: abstract.id, 
          status: newStatus,
          updatedBy: 'admin',
          comments: `Individual ${newStatus} operation`
        })
      });

      const result = await response.json();

      if (document.body.contains(loadingToast)) {
        document.body.removeChild(loadingToast);
      }

      if (result.success) {
        let emailSent = false;
        if (newStatus === 'approved') {
          emailSent = await EmailIntegration.sendApprovalEmail(abstract);
        } else if (newStatus === 'rejected') {
          emailSent = await EmailIntegration.sendRejectionEmail(abstract, 'Individual review decision');
        }

        showToast(
          `${statusIcon} ${statusText} Successful!\n\n` +
          `📝 Abstract: "${abstract.title}"\n` +
          `👤 Author: ${abstract.author}\n` +
          `📧 Email: ${abstract.email}\n\n` +
          `💾 Database: ✅ Updated\n` +
          `📧 Email: ${emailSent ? '✅ Sent' : '❌ Failed'}\n\n` +
          `🔄 Page will refresh in 2 seconds`,
          'success',
          8000
        );

        setTimeout(() => {
          window.location.reload();
        }, 2000);

      } else {
        throw new Error(result.error || 'Update failed');
      }

    } catch (error) {
      console.error('Individual update error:', error);
      showToast(
        `❌ ${statusText} Failed!\n\n` +
        `📝 Abstract: "${abstract.title}"\n` +
        `💥 Error: ${error.message}\n\n` +
        `🔧 Please try again or contact administrator.`,
        'error',
        10000
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

      showToast(
        `📊 Export Successful!\n\nDownloaded ${selected.length} abstracts\nFilename: APBMT_Selected_Abstracts_${new Date().toISOString().split('T')[0]}_${selected.length}items.csv`,
        'success',
        8000
      );

      setSelectedAbstracts([]);
      setSelectAll(false);

    } catch (error) {
      console.error('❌ Export error:', error);
      showToast(`❌ Export failed: ${error.message}\n\nPlease try again or contact support.`, 'error');
    }
  };

  // Category-wise Quick Selection
  const handleSelectByCategory = (category) => {
    const categoryAbstracts = getFilteredAbstracts().filter(abstract => 
      abstract.category === category
    );
    
    if (categoryAbstracts.length === 0) {
      showToast(`❌ No ${category} abstracts found in current view`, 'warning');
      return;
    }

    const categoryIds = categoryAbstracts.map(abstract => abstract.id);
    setSelectedAbstracts(categoryIds);
    
    const filteredAbstracts = getFilteredAbstracts();
    setSelectAll(categoryIds.length === filteredAbstracts.length);

    showToast(
      `✅ Selected ${categoryAbstracts.length} ${category} abstracts\n\nReady for bulk operations!`,
      'success',
      5000
    );
  };

  // Advanced Bulk Email with Templates
  const handleAdvancedBulkEmail = () => {
    const selected = getSelectedAbstractObjects();
    
    if (selected.length === 0) {
      showToast('❌ No abstracts selected for bulk email', 'error');
      return;
    }

    const emailType = prompt(
      `📧 Bulk Email to ${selected.length} recipients\n\n` +
      `Choose email template:\n\n` +
      `1. reminder - Submission reminder\n` +
      `2. update - Status update notification\n` +
      `3. schedule - Conference schedule info\n` +
      `4. general - General announcement\n\n` +
      `Enter number (1-4):`
    );

    const templates = {
      '1': 'reminder',
      '2': 'update', 
      '3': 'schedule',
      '4': 'general'
    };

    const selectedTemplate = templates[emailType];
    
    if (!selectedTemplate) {
      showToast('❌ Invalid template selection', 'error');
      return;
    }

    const confirmed = confirm(
      `📧 Send ${selectedTemplate} emails?\n\n` +
      `Recipients: ${selected.length}\n` +
      `Template: ${selectedTemplate.toUpperCase()}\n\n` +
      `This will send individual emails to each presenter.`
    );

    if (confirmed) {
      EmailIntegration.sendBulkEmail(selected, selectedTemplate);
      
      setSelectedAbstracts([]);
      setSelectAll(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const filteredAbstracts = getFilteredAbstracts();

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Enhanced Bulk Operations Toolbar */}
      {selectedAbstracts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-t-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-blue-800 font-medium">
                📋 {selectedAbstracts.length} abstracts selected
              </span>
              <button
                onClick={() => {
                  setSelectedAbstracts([]);
                  setSelectAll(false);
                  showToast('🗑️ Selection cleared', 'info', 2000);
                }}
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Clear selection
              </button>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => handleInternalBulkStatusUpdate('approved')}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium"
              >
                ✅ Bulk Approve ({selectedAbstracts.length})
              </button>
              
              <button
                onClick={() => handleInternalBulkStatusUpdate('rejected')}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium"
              >
                ❌ Bulk Reject ({selectedAbstracts.length})
              </button>
              
              <button
                onClick={handleAdvancedBulkEmail}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium"
              >
                📧 Bulk Email ({selectedAbstracts.length})
              </button>
              
              <button
                onClick={handleBulkExport}
                className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm font-medium"
              >
                📊 Export ({selectedAbstracts.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Quick Selection Panel */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">🎯 Quick Category Selection</h4>
          <span className="text-xs text-gray-500">Select entire categories with one click</span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            onClick={() => handleSelectByCategory('Free Paper')}
            className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-2 rounded text-sm font-medium transition-colors"
          >
            📝 Free Papers
          </button>
          
          <button
            onClick={() => handleSelectByCategory('Poster')}
            className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-2 rounded text-sm font-medium transition-colors"
          >
            🖼️ Posters
          </button>
          
          <button
            onClick={() => handleSelectByCategory('E-Poster')}
            className="bg-purple-100 hover:bg-purple-200 text-purple-800 px-3 py-2 rounded text-sm font-medium transition-colors"
          >
            💻 E-Posters
          </button>
          
          <button
            onClick={() => handleSelectByCategory('Award Paper')}
            className="bg-orange-100 hover:bg-orange-200 text-orange-800 px-3 py-2 rounded text-sm font-medium transition-colors"
          >
            🏆 Awards
          </button>
        </div>
      </div>

      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">📋 Abstract Review Interface</h3>
          <div className="flex gap-2">
            <button 
              onClick={handleBulkExport}
              className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700"
            >
              📊 Export All to Excel
            </button>
            <button 
              onClick={() => EmailIntegration.sendBulkEmail(abstracts, 'reminder')}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
            >
              📧 Send All Bulk Emails
            </button>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="flex gap-4 mb-4">
          <input 
            type="text" 
            placeholder="Search abstracts..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Categories</option>
            <option value="Free Paper">Free Paper Presentation</option>
            <option value="Award Paper">Award Paper Presentation</option>
            <option value="Poster">Poster Presentation</option>
            <option value="E-Poster">E-Poster Presentation</option>
          </select>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
      
      {/* PRD Required Columns Table with Checkboxes */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {/* Master Checkbox Column */}
              <th className="px-3 py-3 text-left">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Select
                  </span>
                </div>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Abstract No
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Submission Date
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Presenter Name
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email ID
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mobile No
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Abstract Title
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Co-Author Name
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Institution Name
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Registration ID
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action Buttons
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAbstracts.map((abstract, index) => (
              <tr 
                key={abstract.id} 
                className={`hover:bg-gray-50 ${selectedAbstracts.includes(abstract.id) ? 'bg-blue-50' : ''}`}
              >
                {/* Individual Checkbox Column */}
                <td className="px-3 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedAbstracts.includes(abstract.id)}
                    onChange={() => handleSelectAbstract(abstract.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {abstract.abstractNumber || `ABST-${String(index + 1).padStart(3, '0')}`}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(abstract.submissionDate)}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  {abstract.author}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                  {abstract.email}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                  {abstract.mobile || 'N/A'}
                </td>
                <td className="px-3 py-4 text-sm text-gray-900 max-w-xs truncate">
                  {abstract.title}
                </td>
                <td className="px-3 py-4 text-sm text-gray-500 max-w-xs truncate">
                  {abstract.coAuthors || 'N/A'}
                </td>
                <td className="px-3 py-4 text-sm text-gray-500 max-w-xs truncate">
                  {abstract.affiliation}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                  {abstract.registrationId || 'N/A'}
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(abstract.status)}`}>
                    {abstract.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-1">
                    <button
                      onClick={() => onSelectAbstract(abstract)}
                      className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                    >
                      View
                    </button>
                    <button
                      onClick={() => onDownload && onDownload(abstract)}
                      className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleIndividualStatusUpdate(abstract, abstract.status === 'approved' ? 'rejected' : 'approved')}
                      className="bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700"
                    >
                      {abstract.status === 'approved' ? 'Reject' : 'Approve'}
                    </button>
                    <EmailActionButton 
                      abstract={abstract} 
                      buttonType="status"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {filteredAbstracts.length === 0 && (
        <div className="p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">📭</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No abstracts found</h3>
          <p className="text-gray-600">No abstracts match your current filters.</p>
        </div>
      )}
    </div>
  );
};

// 3. PRD SECTION 3.4.4 - Abstract Review Modal WITH EMAIL INTEGRATION
export const AbstractReviewModal = ({ abstract, isOpen, onClose, onUpdateStatus }) => {
  const [selectedStatus, setSelectedStatus] = useState(abstract?.status || 'pending');
  const [presentationType, setPresentationType] = useState(abstract?.category || 'Free Paper');
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [reviewerComments, setReviewerComments] = useState('');

  if (!isOpen || !abstract) return null;

  const handleSaveReview = async () => {
    if (onUpdateStatus) {
      onUpdateStatus({
        abstractId: abstract.id,
        status: selectedStatus,
        presentationType,
        reviewerComments,
        sendEmailNotification
      });
    }

    // Send email notification if enabled
    if (sendEmailNotification) {
      if (selectedStatus === 'approved') {
        await EmailIntegration.sendApprovalEmail(abstract);
      } else if (selectedStatus === 'rejected') {
        await EmailIntegration.sendRejectionEmail(abstract, reviewerComments);
      }
    }

    showToast(
      `✅ Review Saved Successfully!\n\n` +
      `📝 Abstract: "${abstract.title}"\n` +
      `🔄 Status: ${selectedStatus.toUpperCase()}\n` +
      `📧 Email: ${sendEmailNotification ? 'Sent' : 'Not sent'}\n\n` +
      `Modal will close automatically.`,
      'success',
      5000
    );

    setTimeout(() => {
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Abstract Review Modal - {abstract.abstractNumber || abstract.id}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Full Abstract Text Display */}
            <div>
              <h4 className="text-md font-semibold mb-3 text-gray-900">📄 Full Abstract Text Display</h4>
              <div className="bg-gray-50 border rounded-lg p-4 max-h-80 overflow-y-auto">
                <h5 className="font-semibold text-gray-900 mb-2">{abstract.title}</h5>
                <div className="text-sm text-gray-700 space-y-2">
                  <p><strong>Author:</strong> {abstract.author}</p>
                  <p><strong>Institution:</strong> {abstract.affiliation}</p>
                  <p><strong>Category:</strong> {abstract.category}</p>
                  <div className="mt-4">
                    <p className="whitespace-pre-wrap">{abstract.abstract}</p>
                  </div>
                </div>
              </div>
              
              {/* Uploaded File Viewer */}
              <div className="mt-4">
                <h4 className="text-md font-semibold mb-2 text-gray-900">📎 Uploaded File Viewer</h4>
                <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">📄</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{abstract.fileName || 'abstract.pdf'}</p>
                        <p className="text-xs text-gray-500">PDF Document • {abstract.fileSize || '2.3 MB'}</p>
                      </div>
                    </div>
                    <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                      📥 Download
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Review Controls */}
            <div>
              <h4 className="text-md font-semibold mb-3 text-gray-900">🔧 Review Controls</h4>
              
              {/* Status Dropdown */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status Dropdown
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              {/* Presentation Type Switcher */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Presentation Type Switcher
                </label>
                <select
                  value={presentationType}
                  onChange={(e) => setPresentationType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Free Paper">Free Paper Presentation</option>
                  <option value="Award Paper">Award Paper Presentation</option>
                  <option value="Poster">Poster Presentation</option>
                  <option value="E-Poster">E-Poster Presentation</option>
                </select>
              </div>
              
              {/* Email Notification Toggle */}
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={sendEmailNotification}
                    onChange={(e) => setSendEmailNotification(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Email Notification Toggle</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">Send email notification to presenter</p>
              </div>
              
              {/* Comments/Feedback Text Area */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments/Feedback Text Area
                </label>
                <textarea
                  value={reviewerComments}
                  onChange={(e) => setReviewerComments(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter reviewer comments or feedback for the presenter..."
                />
              </div>
              
              {/* Quick Email Actions */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h5 className="text-sm font-medium text-gray-700 mb-3">📧 Quick Email Actions</h5>
                <div className="flex gap-2">
                  <EmailActionButton 
                    abstract={abstract} 
                    buttonType="approval"
                    className="flex-1"
                  />
                  <EmailActionButton 
                    abstract={abstract} 
                    buttonType="rejection"
                    className="flex-1"
                  />
                  <EmailActionButton 
                    abstract={abstract} 
                    buttonType="status"
                    className="flex-1"
                  />
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleSaveReview}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  💾 Save Review
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-400 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-500 transition-colors"
                >
                  ❌ Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
