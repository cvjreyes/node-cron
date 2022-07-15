const fs = require("fs");
const sql = require("../../db.js");
var format = require('date-format');
var cron = require('node-cron');
const csv=require('csvtojson')

cron.schedule('0 */5 * * * *', async () => {
    await uploadReportPeriod()
    const timeoutObj = setTimeout(() => {
      downloadIssuedTo3D()
    }, 15000)
  })

  async function uploadReportPeriod(){
    console.log("empieza dpipes")
    await csv()
    .fromFile(process.env.NODE_DPIPES_ROUTE)
    .then((jsonObj)=>{
        const csv = jsonObj
  
        sql.query("SELECT isoid, tpipes_id FROM dpipes_view", (err, results) =>{
          if(!results[0]){
            console.log("No existe")
          }else{
            const isoids = results
            for(let i = 0; i < isoids.length; i++){
              sql.query('UPDATE misoctrls set before_tpipes_id = ? WHERE isoid COLLATE utf8mb4_unicode_ci = ?', [isoids[i].tpipes_id, isoids[i].isoid], (err, results)=>{
                if(err){
                  console.log("Error updating")
                }
              })
            }
          }
        })
  
        sql.query("TRUNCATE dpipes", (err, results)=>{
          if(err){
            console.log(err)
          }
        })
        for(let i = 0; i < csv.length; i++){
          if(csv[i].spo === "true"){
            sql.query('UPDATE misoctrls LEFT JOIN dpipes_view ON misoctrls.isoid COLLATE utf8mb4_unicode_ci = dpipes_view.isoid SET spo = 1 WHERE dpipes_view.tag = ?', [csv[i].tag], (err, results)=>{
              if(err){
                console.log("Error updating")
              }
            })
          }
          if(csv[i].area != '' && csv[i].area != null && !csv[i].tag.includes("/") && !csv[i].tag.includes("=") && !csv[i].diameter != null){
            sql.query("SELECT id FROM areas WHERE name = ?", [csv[i].area], (err, results) =>{
              let areaid = null
              if(results[0]){
                areaid = results[0].id
              }
              if(process.env.NODE_MMDN == 1){
                sql.query("SELECT id FROM diameters WHERE nps = ?", [csv[i].diameter], (err, results) =>{
                  if(!results[0]){
                  }else{
                    const diameterid = results[0].id
                    let calc_notes = 0
                    if(csv[i].calc_notes != "" && csv[i].calc_notes != null){
                      calc_notes = 1
                    }
        
                    let tl = 0
        
                    if(calc_notes == 1){
                      tl = 3
                    }else{
                      if(csv[i].diameter < 2.00){
                        tl = 1
                      }else{
                        tl = 2
                      }
                    }
                    sql.query("INSERT INTO dpipes(area_id, tag, diameter_id, calc_notes, tpipes_id, diameter, calc_notes_description, pid, stress_level, insulation, unit, fluid, seq, train, spec) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [areaid, csv[i].tag, diameterid, calc_notes, tl, csv[i].diameter, csv[i].calc_notes, csv[i].pid, csv[i].stresslevel, csv[i].insulation, csv[i].unit, csv[i].fluid, csv[i].seq, csv[i].train, csv[i].spec], (err, results)=>{
                      if(err){
                        console.log(err)
                      }
                    })
                  }
                })
              }else{
                sql.query("SELECT id FROM diameters WHERE dn = ?", [csv[i].diameter], (err, results) =>{
                  if(!results[0]){
  
                  }else{
                    const diameterid = results[0].id
                    let calc_notes = 0
                    if(csv[i].calc_notes != "" && csv[i].calc_notes != null){
                      calc_notes = 1                  
                    }
        
                    let tl = 0
        
                    if(calc_notes == 1){
                      tl = 3
                    }else{
                      if(csv[i].diameter < 50){
                        tl = 1
                      }else{
                        tl = 2
                      }
                    }
                    sql.query("INSERT INTO dpipes(area_id, tag, diameter_id, calc_notes, tpipes_id, diameter, calc_notes_description, pid, stress_level, insulation, unit, fluid, seq, train, spec) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [areaid, csv[i].tag, diameterid, calc_notes, tl, csv[i].diameter, csv[i].calc_notes, csv[i].pid, csv[i].stresslevel, csv[i].insulation, csv[i].unit, csv[i].fluid, csv[i].seq, csv[i].train, csv[i].spec], (err, results)=>{
                      if(err){
                        console.log(err)
                      }
                    })
                  }
                })
              }
              
            })
            
          }
        }
        console.log("Dpipes updated")
  
    })
    const timeoutObj = setTimeout(() => {
      refreshProgress()
    }, 5000)
    
  }


async function refreshProgress(){

  sql.query('SELECT filename, isoid, `to`, before_tpipes_id, issued FROM misoctrls', (err, results) =>{
    if(!results[0]){
      console.log("Empty misoctrls")
    }else{
      const lines = results
      let type = null
      if(process.env.NODE_IFC == "0"){
        type = "value_ifd"
      }else{
        type = "value_ifc"
      }
      for(let i = 0; i < lines.length; i++){
        sql.query("SELECT tpipes_id FROM dpipes_view WHERE isoid COLLATE utf8mb4_unicode_ci = ?", [lines[i].isoid], (err, results)=>{
          if(!results[0]){
            console.log("No existe en dpipes ", lines[i].isoid)
          }else{
            tl = results[0].tpipes_id
            const q = "SELECT "+type+" FROM ppipes WHERE level = ? AND tpipes_id = ?"
            let level = lines[i].to
            if(level == "LDE/Isocontrol"){
              if(lines[i].issued == 1){
                level = "Transmittal"
              }else{
                level = "Issuer"
              }
            }
            sql.query(q, [level, tl], (err, results)=>{
              if(!results[0]){
                console.log("No existe")
              }else{
                let newRealRrogress = null
                if(type == "value_ifc"){
                  newRealRrogress = results[0].value_ifc
                }else{
                  newRealRrogress = results[0].value_ifd
                }
                sql.query("SELECT progress, max_tray FROM misoctrls WHERE filename = ?", [lines[i].filename], (err, results1) =>{
                  if(!results1[0]){
                    console.log("No existe miso")        
                  }else{
                    let progress = results1[0].progress
                    let max_tray = results1[0].max_tray
                    const q2 = "SELECT "+type+ " as newp FROM ppipes WHERE level = ? AND tpipes_id = ?"
                    sql.query(q2, [max_tray, lines[i].before_tpipes_id], (err, results)=>{
                      if(!results[0]){
                        console.log("No existe")
                      }else{
                        
                        const newProgress = results[0].newp
                        sql.query("UPDATE misoctrls SET progress = ?, realprogress = ? WHERE filename = ?", [newRealRrogress, newProgress, lines[i].filename], (err, results) =>{
                          if (err) {
                              console.log("No existe")
                              console.log("error: ", err);
                          }else{
                              
                          }
                        })
                      }
                    })
                    
                  }
                })
                                                      
              }
            })
          }
        })
      }
    }
  })
  console.log("updated progress" );
}

function downloadIssuedTo3D(){
  let exists = false
  sql.query("SELECT dpipes_view.tag, revision, issued, issuer_date, issuer_designation, issuer_draw, issuer_check, issuer_appr FROM dpipes_view JOIN misoctrls ON misoctrls.isoid COLLATE utf8mb4_unicode_ci = dpipes_view.isoid WHERE `to` = ?", ["Issuer"], (err, results) =>{
      if(err){
        console.log(err)
      }
      if(!results[0]){

      let emptylog = []
      emptylog.push("DESIGN\n")
      emptylog.push("ONERROR CONTINUE\n")
      emptylog.push("FINISH")
      emptyLogToText = ""
        for(let i = 0; i < emptylog.length; i++){
          emptyLogToText += emptylog[i]+"\n"
        }
      fs.writeFile("IssuerFromIsoTrackerTo3d.mac", emptyLogToText, function (err) {
        if (err) return console.log(err);
        fs.copyFile('./IssuerFromIsoTrackerTo3d.mac', process.env.NODE_ISSUER_ROUTE, (err) => {
          if (err) throw err;
        });
      });
    }else{
          let log = []
      log.push("DESIGN")
      log.push("ONERROR CONTINUE\n")
      for(let i = 0; i < results.length;i++){
        if(results[i].issuer_date && results[i].issuer_designation && results[i].issuer_draw && results[i].issuer_check && results[i].issuer_appr){
          exists = true
          let r = results[i].revision
          if(results[i].issued){
            r = results[i].revision - 1
          }
          let d = new Date(results[i].issuer_date)
          let month = (d.getMonth()+1).toString()
          let day = (d.getDate()).toString()
  
          if(month.length == 1){
            month = "0" + month
          }
  
          if(day.length == 1){
            day = "0" + day
          }
  
          d = day + "/" + month + "/" + d.getFullYear()
          d = d.substring(0,6) + d.substring(8,10)
  
          if(r == 0){
            log.push("ONERROR GOLABEL " + results[i].tag)
            log.push("/" + results[i].tag)
            log.push("UNLOCK ALL")
            log.push("NEW TEXT /" + results[i].tag + "/" + r)
            log.push("HANDLE ANY")
            log.push("DELETE TEXT")
            log.push("ENDHANDLE")
            log.push("/"+ results[i].tag +"/" + r)
  
          }else{
            log.push("/" + results[i].tag + "/" + (r-1))
            log.push("UNLOCK ALL")
            log.push("NEW TEXT /" + results[i].tag +"/" + r)
            log.push("HANDLE ANY")
            log.push("DELETE TEXT")
            log.push("ENDHANDLE")
            log.push("/" + results[i].tag +"/" + r)
            
          }
  
          log.push(":TP-REV-IND '" + r + "'")
          log.push(":TP-REV-DATE '" + d + "'")
          log.push(":TP-REV-DESIGNATION '" + results[i].issuer_designation + "'")
          log.push(":TP-REV-DRAW '" + results[i].issuer_draw + "'")
          log.push(":TP-REV-CHECK '" + results[i].issuer_check + "'")
          log.push(":TP-REV-APPR '" + results[i].issuer_appr + "'\n")
          log.push("LABEL " + results[i].tag)
        }
        
      }
      log.push("SAVEWORK")
      log.push("UNCLAIM ALL")
      log.push("FINISH")
      logToText = ""
      for(let i = 0; i < log.length; i++){
        logToText += log[i]+"\n"
      }
      if(exists){
        fs.unlink('IssuerFromIsoTrackerTo3d.mac',function(err){
          if(err) return console.log(err);
        
        });  
        fs.writeFile("IssuerFromIsoTrackerTo3d.mac", logToText, function (err) {
          if (err) return console.log(err);
          fs.copyFile('./IssuerFromIsoTrackerTo3d.mac', process.env.NODE_ISSUER_ROUTE, (err) => {
            if (err) throw err;
          });
        });

      }else{
        let emptylog = []
        emptylog.push("DESIGN\n")
        emptylog.push("ONERROR CONTINUE\n")
        emptylog.push("FINISH")
        emptyLogToText = ""
        for(let i = 0; i < emptylog.length; i++){
          emptyLogToText += emptylog[i]+"\n"
        }
        fs.unlink('IssuerFromIsoTrackerTo3d.mac',function(err){
          if(err) return console.log(err);
        });
        fs.writeFile("IssuerFromIsoTrackerTo3d.mac", emptyLogToText, function (err) {
	
          if (err) return console.log(err);
	  
          fs.copyFile('./IssuerFromIsoTrackerTo3d.mac', process.env.NODE_ISSUER_ROUTE, (err) => {
            if (err) throw err;
          });
        });
      }
        }
      })
    console.log("Generated issuer report")
}

module.exports = {

}