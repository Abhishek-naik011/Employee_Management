import React, { useState, useEffect } from 'react';

const ChatDataViewer = ({ dataPayload, moduleName }) => {
   const [currentPage, setCurrentPage] = useState(0);
   const [searchTerm, setSearchTerm] = useState('');
   const itemsPerPage = 10;

   useEffect(() => {
      const handleCommand = (e) => {
         console.log("COMMAND RECEIVED:", e.detail);
         const cmd = e.detail;
         if (cmd === "next") {
            console.log("NEXT PAGE");
            setCurrentPage(p => p + 1);
         } else if (cmd === "prev" || cmd === "previous") {
            console.log("PREVIOUS PAGE");
            setCurrentPage(p => Math.max(0, p - 1));
         } else if (cmd.startsWith("search ")) {
            console.log("SEARCH:", cmd);
            setSearchTerm(cmd.substring(7));
            setCurrentPage(0);
         }
      };
      window.addEventListener('chatbot_data_command', handleCommand);
      return () => window.removeEventListener('chatbot_data_command', handleCommand);
   }, []);

   if (!Array.isArray(dataPayload) || dataPayload.length === 0) {
      return <div className="text-sm italic text-gray-500 mt-2">No records found.</div>;
   }

   // Filtering
   const filtered = dataPayload.filter(item => {
      if (!searchTerm) return true;
      const text = JSON.stringify(item).toLowerCase();
      return text.includes(searchTerm);
   });

   const total = filtered.length;
   const start = currentPage * itemsPerPage;
   const actualStart = start >= total ? 0 : start;
   if (start >= total && total > 0) setCurrentPage(0);
   const paginated = filtered.slice(actualStart, actualStart + itemsPerPage);

   const normalizedModule = moduleName ? moduleName.toLowerCase() : "";
   if (normalizedModule === "employees") {
      console.log("ChatDataViewer rendering employees data:", dataPayload);
   }

   return (
      <div className="mt-3 w-full max-w-full">
         {searchTerm && (
            <div className="mb-3 inline-block rounded bg-blue-100 px-3 py-1 text-sm text-blue-700 font-semibold">
               Searching: "{searchTerm}"
            </div>
         )}

         <div
            className="w-full max-w-full overflow-x-auto rounded-lg border border-gray-200 shadow-sm bg-white"
            style={{ scrollbarGutter: "stable both-edges" }}
         >
            <table className="min-w-max table-auto border-collapse">
               <thead className="bg-blue-600 text-white sticky top-0">
                  {normalizedModule === "employees" && (
                     <tr>
                        <th className="px-2 py-2 text-left whitespace-nowrap">ID</th>
                        <th className="px-2 py-2 text-left whitespace-nowrap">Employee Name</th>
                        <th className="px-2 py-2 text-left whitespace-nowrap">Department</th>
                        <th className="px-2 py-2 text-left whitespace-nowrap">Role</th>
                        <th className="px-2 py-2 text-left whitespace-nowrap">Status</th>
                     </tr>
                  )}
                  {normalizedModule === "departments" && (
                     <tr>
                        <th className="px-2 py-2 text-left break-words">ID</th>
                        <th className="px-2 py-2 text-left break-words">Department</th>
                        <th className="px-2 py-2 text-left whitespace-nowrap">Head</th>
                        <th className="px-2 py-2 text-left whitespace-nowrap">Description</th>
                     </tr>
                  )}
                  {(normalizedModule === "projects" || normalizedModule === "my_projects") && (
                     <tr>
                        <th className="px-2 py-2 text-left whitespace-nowrap">ID</th>
                        <th className="px-2 py-2 text-left whitespace-nowrap">Project</th>
                        <th className="px-2 py-2 text-left whitespace-nowrap">Status</th>
                        <th className="px-2 py-2 text-left whitespace-nowrap">Start</th>
                        <th className="px-2 py-2 text-left whitespace-nowrap">End</th>
                     </tr>
                  )}
                  {normalizedModule === "roles" && (
                     <tr>
                        <th className="px-2 py-2 text-left whitespace-nowrap">ID</th>
                        <th className="px-2 py-2 text-left whitespace-nowrap">Role</th>
                        <th className="px-2 py-2 text-left whitespace-nowrap">Permissions</th>
                     </tr>
                  )}
               </thead>
               <tbody>
                  {paginated.map((item, index) => (
                     <tr key={index} className="border-b hover-bg-blue-50 even-bg-gray-50">
                        {normalizedModule === "employees" && (
                           <>
                              <td className="px-2 py-2 whitespace-nowrap">{item.employee_id}</td>
                              <td className="px-2 py-2 font-semibold whitespace-nowrap">{item.full_name}</td>
                              <td className="px-2 py-2 whitespace-nowrap">{item.department_name || item.department || "No Dept"}</td>
                              <td className="px-2 py-2 whitespace-nowrap">{item.role_name || item.role || "No Role"}</td>
                              <td className="px-2 py-2 whitespace-nowrap">
                                 <span className={`px-2 py-1 rounded text-xs ${item.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                    {item.status || "Unknown"}
                                 </span>
                              </td>
                           </>
                        )}
                        {normalizedModule === "departments" && (
                           <>
                              <td className="px-2 py-2 whitespace-nowrap">{item.department_id}</td>
                              <td className="px-2 py-2 whitespace-nowrap">{item.department_name}</td>
                              <td className="px-2 py-2 whitespace-nowrap">{item.head_name || 'Not Assigned'}</td>
                              <td className="px-2 py-2 whitespace-nowrap">{item.description}</td>
                           </>
                        )}
                        {(normalizedModule === "projects" || normalizedModule === "my_projects") && (
                           <>
                              <td className="px-2 py-2 whitespace-nowrap">{item.project_id}</td>
                              <td className="px-2 py-2 whitespace-nowrap">{item.project_name}</td>
                              <td className="px-2 py-2 whitespace-nowrap">{item.status}</td>
                              <td className="px-2 py-2 whitespace-nowrap">{item.start_date ? new Date(item.start_date).toLocaleDateString() : "-"}</td>
                              <td className="px-2 py-2 whitespace-nowrap">{item.end_date ? new Date(item.end_date).toLocaleDateString() : "-"}</td>
                           </>
                        )}
                        {normalizedModule === "roles" && (
                           <>
                              <td className="px-2 py-2 whitespace-nowrap">{item.role_id}</td>
                              <td className="px-2 py-2 whitespace-nowrap">{item.role_name}</td>
                              <td className="px-2 py-2 whitespace-nowrap">
                                 {Array.isArray(item.permissions) ? item.permissions.join(", ") : "No Permissions"}
                              </td>
                           </>
                        )}
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>

         <div className="mt-3 text-center text-sm text-gray-500">
            Showing {actualStart + 1} to {Math.min(actualStart + itemsPerPage, total)} of {total}
         </div>

         <div className="flex justify-center items-center mt-2 space-x-4 text-sm">
            <button
               onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
               disabled={currentPage === 0}
               className={`px-3 py-1 rounded ${currentPage === 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
            >
               ← Previous
            </button>
            <span>Page {currentPage + 1} of {Math.ceil(total / itemsPerPage)}</span>
            <button
               onClick={() => setCurrentPage(p => p + 1)}
               disabled={currentPage >= Math.ceil(total / itemsPerPage) - 1}
               className={`px-3 py-1 rounded ${currentPage >= Math.ceil(total / itemsPerPage) - 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
            >
               Next →
            </button>
         </div>
      </div>
   );
};

export default ChatDataViewer;