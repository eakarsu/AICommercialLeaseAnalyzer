'use strict';
const {createWave30cRouter}=require('./wave30c');
const {authenticateToken}=require('../middleware/auth');
let pool; try{ pool=require('../config/database'); }catch{}
async function poolQuery(){ const {Lease}=require('../models'); const rows=await Lease.findAll({order:[['createdAt','DESC']],limit:200}); return rows.map(r=>r.toJSON()); }
module.exports=createWave30cRouter({auth:authenticateToken,loadRecords:poolQuery,features:["lease-risk-summary", "critical-date-outlook", "portfolio-concentration-brief"],searchFields:['tenantName','propertyAddress','title','name']});
