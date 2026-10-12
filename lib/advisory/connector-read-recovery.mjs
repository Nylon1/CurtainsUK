// Operator bridge classification only. Never retry a write or infer success.
// A confirmed cancelled read returns to full admission after exact reconciliation.
export function connectorFailureCode({query,result}) {
 if(!result?.isError||typeof query!=='string'||!/^begin read only;set local statement_timeout='3s';(?:select|with)\b[^;]*;commit;$/i.test(query))return 'CONNECTOR_ERROR';
 const content=result.content;
 if(!Array.isArray(content)||content.length!==1||content[0]?.type!=='text')return 'CONNECTOR_ERROR';
 const transport=result.structuredContent;
 if(content[0].text==='McpServerError: Connection timed out.'&&transport?.error_code==='UNAVAILABLE'&&transport.error==='McpServerError: Connection timed out.'&&transport.error_data?.type==='mcp_network_error'&&transport.error_data.code==='network_error'&&transport.error_data.message==='Connection timed out.'&&transport.error_data.url==='https://mcp.supabase.com/mcp')return 'TRANSIENT_SQL_READ_TRANSPORT';
 try {
  const error=JSON.parse(content[0].text)?.error;
  if(error?.name==='HttpException'&&typeof error.message==='string'&&/^Failed to run sql query: ERROR:\s+57014: canceling statement due to statement timeout\s*$/.test(error.message))return 'TRANSIENT_SQL_READ_TIMEOUT';
 }catch{}
 return 'CONNECTOR_ERROR';
}
