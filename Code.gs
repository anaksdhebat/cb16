// Konfigurasi sheet awal
const SPREADSHEET_ID = "18sTX5RYOlW9adTLJ1za8pqhQHPmGXaK1xMZhgrLqohM";
const sheetAdminGuru = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Admin");
const sheetSiswa = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Siswa");

// =================================================================================
// FUNGSI ROUTING UTAMA (GET & POST)
// =================================================================================
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  if (action === "login") { return handleLogin(data); }
  else if (action === "create") { return handleCreate(data); }
  else if (action === "updateData") { return handleUpdateData(data); }
  else if (action === "deleteData") { return handleDeleteData(data); }
  else if (action === "updateSchoolInfo") { return handleUpdateSchoolInfo(data); }
  else if (action === "submitDailyActivity") { return handleSubmitDailyActivity(data); }
  else if (action === "update") { return handleUpdate(data); }
  else if (action === "delete") { return handleDelete(data); }
  else if (action === "updateSettings") { return handleUpdateSettings(data); }
  else if (action === "uploadSiswaExcel") { return handleUploadSiswaExcel(data); }
  else if (action === "restoreAllData") { return handleRestoreAllData(data); }
  else if (action === "updateIbadahDropdowns") { return handleUpdateIbadahDropdowns(data); }
  
  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Aksi POST tidak valid" })).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = e.parameter.action;

  if (action === "readAll") { return handleReadAll(); }
  else if (action === "getGlobalSettings") { return handleGetGlobalSettings(); }
  else if (action === "getSiswaNameByInduk") { return handleGetSiswaNameByInduk(e); }
  else if (action === "getSiswaDataByInduk") { return handleGetSiswaDataByInduk(e); }
  else if (action === "getKelasData") { return handleGetKelasData(e); }
  else if (action === "getPercentageRekap") { return getPercentageRekapForAllClasses(); }
  else if (action === "backupAllData") { return handleBackupAllData(); }
  else if (action === "getIbadahDropdowns") { return handleGetIbadahDropdowns(); }

  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Aksi GET tidak valid" })).setMimeType(ContentService.MimeType.JSON);
}


// =================================================================================
// FUNGSI UNTUK MENGELOLA DROPDOWN IBADAH (VERSI FINAL)
// =================================================================================
function handleGetIbadahDropdowns() {
  try {
    const lastRow = sheetAdminGuru.getLastRow();
    
    // 1. Mengambil Opsi Dropdown (dari kolom I3:O)
    const dropdownData = {};
    if (lastRow >= 3) {
      const range = sheetAdminGuru.getRange("I3:O" + lastRow);
      const values = range.getValues();
      const numCols = 7;
      const numRows = values.length;

      for (let j = 0; j < numCols; j++) {
        const options = [];
        for (let i = 0; i < numRows; i++) {
          if (values[i][j]) { 
            options.push(values[i][j]);
          }
        }
        dropdownData[`ibadah${j + 1}`] = options;
      }
    }

    // 2. Mengambil Pengaturan Checklist TRUE/FALSE (dari kolom V2:AB2)
    const ibadahSettings = sheetAdminGuru.getRange("V2:AB2").getValues()[0];

    // 3. Menggabungkan keduanya dalam satu output
    const responseData = {
      options: dropdownData,
      settings: ibadahSettings
    };
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: responseData })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleUpdateIbadahDropdowns(payload) {
  try {
    const data = payload.data; // Menerima data 2D array dari client
    if (!data) {
      throw new Error("Tidak ada data yang diterima.");
    }
    
    const lastRow = sheetAdminGuru.getLastRow();
    // Tentukan range yang akan dibersihkan. Mulai dari I3 sampai O, hingga baris terakhir yang mungkin ada datanya.
    if (lastRow >= 3) {
      const clearRange = sheetAdminGuru.getRange("I3:O" + lastRow);
      clearRange.clearContent();
    }

    // Jika ada data baru yang dikirim, tulis kembali.
    if (data.length > 0) {
      const newRange = sheetAdminGuru.getRange(3, 9, data.length, data[0].length); // Baris 3, Kolom 9 (I)
      newRange.setValues(data);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Opsi dropdown ibadah berhasil diperbarui." })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Gagal menyimpan: " + error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

// =================================================================================
// FUNGSI-FUNGSI HANDLER BACKUP & RESTORE
// =================================================================================
function handleBackupAllData() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const allSheets = spreadsheet.getSheets();
    const backupData = {};

    allSheets.forEach(sheet => {
      const sheetName = sheet.getName();
      const data = sheet.getDataRange().getValues();
      backupData[sheetName] = data;
    });

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: backupData
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Gagal membuat backup: " + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleRestoreAllData(payload) {
  try {
    const backupData = payload.data;
    const sheetNamesInBackup = Object.keys(backupData);
    if (!sheetNamesInBackup || sheetNamesInBackup.length === 0) {
      throw new Error("File backup tidak valid atau kosong.");
    }

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    const existingSheets = spreadsheet.getSheets();
    existingSheets.forEach(sheet => {
      if (sheetNamesInBackup.indexOf(sheet.getName()) === -1) {
        spreadsheet.deleteSheet(sheet);
      }
    });
    
    for (const sheetName of sheetNamesInBackup) {
      const sheetData = backupData[sheetName];
      let sheet = spreadsheet.getSheetByName(sheetName);

      if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName);
      } else {
        sheet.clear();
      }

      if (sheetData && sheetData.length > 0) {
        sheet.getRange(1, 1, sheetData.length, sheetData[0].length).setValues(sheetData);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Semua data berhasil dipulihkan."
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Gagal memulihkan data: " + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// =================================================================================
// FUNGSI-FUNGSI HANDLER LAINNYA
// =================================================================================
function handleUploadSiswaExcel(payload) {
  try {
    const siswaData = payload.data;
    if (siswaData && siswaData.length > 0) {
      sheetSiswa.getRange(sheetSiswa.getLastRow() + 1, 1, siswaData.length, siswaData[0].length).setValues(siswaData);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: siswaData.length + ' data siswa berhasil diunggah.'
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      throw new Error("Tidak ada data valid untuk diunggah.");
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Terjadi kesalahan di server: " + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleUpdateSettings(data) {
  try {
    const settings = data.values;
    if (settings.predikat) {
      sheetAdminGuru.getRange("Q2:U2").setValues([[
        settings.predikat.taatText,
        settings.predikat.taatValue,
        settings.predikat.terbiasaText,
        settings.predikat.terbiasaValue,
        settings.predikat.kurangText
      ]]);
    }
    if (settings.ibadah) {
      sheetAdminGuru.getRange("V2:AB2").setValues([settings.ibadah.settings]);
    }
    if (settings.waktu) {
      sheetAdminGuru.getRange("AC2").setValue(settings.waktu.bangunPagi);
      sheetAdminGuru.getRange("AD2").setValue(settings.waktu.tidurCepat);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleGetGlobalSettings() {
  try {
    const settingsRange = sheetAdminGuru.getRange("I2:AD2").getValues()[0];
    const scriptTimeZone = Session.getScriptTimeZone();
    const globalSettings = {
      schoolInfo: {
        "NAMA Sekolah": settingsRange[0], "NPSN": settingsRange[1], "Alamat": settingsRange[2],
        "Jenjang": settingsRange[3], "Url Logo Sekolah": settingsRange[4], "Nama Kepala Sekolah": settingsRange[5],
        "NIP Kepala Sekolah": settingsRange[6], "Nomor HP Admin": settingsRange[7]
      },
      predikat: {
        taatText: settingsRange[8], taatValue: settingsRange[9],
        terbiasaText: settingsRange[10], terbiasaValue: settingsRange[11],
        kurangText: settingsRange[12]
      },
      ibadah: {
        settings: settingsRange.slice(13, 20)
      },
      waktu: {
        bangunPagi: settingsRange[20] ? Utilities.formatDate(new Date(settingsRange[20]), scriptTimeZone, "HH:mm") : "05:00",
        tidurCepat: settingsRange[21] ? Utilities.formatDate(new Date(settingsRange[21]), scriptTimeZone, "HH:mm") : "21:00"
      }
    };
    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", data: globalSettings }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getPercentageRekapForAllClasses() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const rekapResults = {};
    const ibadahSettings = sheetAdminGuru.getRange("V2:AB2").getValues()[0];
    const ibadahThreshold = ibadahSettings.filter(setting => setting === true).length;
    
    const scriptTimeZone = Session.getScriptTimeZone();
    
    const waktuSettings = sheetAdminGuru.getRange("AC2:AD2").getValues()[0];
    const bangunPagiLimitStr = waktuSettings[0] ? Utilities.formatDate(new Date(waktuSettings[0]), scriptTimeZone, "HH:mm") : "05:00";
    const tidurCepatLimitStr = waktuSettings[1] ? Utilities.formatDate(new Date(waktuSettings[1]), scriptTimeZone, "HH:mm") : "21:00";

    const adminGuruData = sheetAdminGuru.getRange("F2:F" + sheetAdminGuru.getLastRow()).getValues();
    const classNames = [...new Set(adminGuruData.flat().filter(String))];

    for (const className of classNames) {
      const sheet = spreadsheet.getSheetByName(className);
      if (!sheet) continue;
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) continue;

      const totalEntries = data.length - 1;
      const totalScores = { beribadah: 0, tidurCepat: 0, bangunPagi: 0, olahraga: 0, belajar: 0, makanBergizi: 0, bermasyarakat: 0 };

      for (let i = 1; i < data.length; i++) {
        const rowData = data[i];
        let ibadahPoint = 0;
        
        for (let j = 0; j < 7; j++) {
          if (ibadahSettings[j] === true && String(rowData[j+3]).trim()) {
            ibadahPoint++;
          }
        }
        
        if (ibadahThreshold > 0 && ibadahPoint >= ibadahThreshold) totalScores.beribadah++;
        if (rowData[11]) { try { const timeStr = Utilities.formatDate(new Date(rowData[11]), scriptTimeZone, "HH:mm"); if (timeStr <= tidurCepatLimitStr) totalScores.tidurCepat++; } catch (e) {} }
        if (rowData[10]) { try { const timeStr = Utilities.formatDate(new Date(rowData[10]), scriptTimeZone, "HH:mm"); if (timeStr <= bangunPagiLimitStr) totalScores.bangunPagi++; } catch (e) {} }

        if (String(rowData[12]).trim()) totalScores.olahraga++;
        
        let belajarPoint = 0;
        if (String(rowData[13]).trim()) belajarPoint++;
        if (String(rowData[14]).trim()) belajarPoint++;
        if (belajarPoint === 2) totalScores.belajar++;
        
        let makanPoint = 0;
        if (String(rowData[15]).trim().toLowerCase() === 'karbo') makanPoint++;
        if (String(rowData[16]).trim().toLowerCase() === 'kb') makanPoint++;
        if (String(rowData[17]).trim().toLowerCase() === 'protein') makanPoint++;
        if (makanPoint === 3) totalScores.makanBergizi++;
        
        if (String(rowData[18]).trim()) totalScores.bermasyarakat++;
      }
      
      const percentages = {};
      for (const key in totalScores) {
          percentages[key] = (totalEntries > 0) ? (totalScores[key] / totalEntries) * 100 : 0;
      }
      rekapResults[className] = percentages;
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: rekapResults })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleLogin(data) {
  const { username, password, role } = data;
  let result = { status: "error", message: "Username atau Password salah." };

  if (role === "Siswa") {
    const siswaData = sheetSiswa.getDataRange().getValues();
    for (let i = 1; i < siswaData.length; i++) {
      if (siswaData[i][2] === username && siswaData[i][1].toString() === password) {
        result = { status: "success", role: "Siswa", url: "Siswa.html" };
        break;
      }
    }
  } else {
    const adminGuruData = sheetAdminGuru.getRange("B2:F" + sheetAdminGuru.getLastRow()).getValues();
    for (let i = 0; i < adminGuruData.length; i++) {
      if (adminGuruData[i][0] === username && adminGuruData[i][1].toString() === password && adminGuruData[i][3] === role) {
        result = { 
          status: "success", 
          role: role, 
          url: `${role}.html`,
          guruName: adminGuruData[i][2],
          guruNip: adminGuruData[i][1],
          kelas: adminGuruData[i][4]
        };
        break;
      }
    }
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function handleGetKelasData(e) {
  try {
    const className = e.parameter.kelas;
    if (!className) {
      throw new Error("Nama kelas tidak disediakan.");
    }
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const classSheet = spreadsheet.getSheetByName(className);
    if (!classSheet) {
      const emptyHeaders = [["Timestamp", "Nama Siswa", "Tanggal Kegiatan", "Ibadah 1", "Ibadah 2", "Ibadah 3", "Ibadah 4", "Ibadah 5", "Ibadah 6", "Ibadah 7", "Bangun Pagi", "Tidur Cepat", "Olahraga", "Tempat Belajar", "Materi yang Dipelajari", "Karbo", "Sayur/Buah", "Susu", "Bermasyarakat"]];
      return ContentService
        .createTextOutput(JSON.stringify({ status: "success", data: emptyHeaders }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const data = classSheet.getDataRange().getValues();
    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", data: data }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleSubmitDailyActivity(data) {
  try {
    if (!data.className) { throw new Error("Nama kelas tidak ditemukan."); }
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let classSheet = spreadsheet.getSheetByName(data.className);
    if (!classSheet) {
        classSheet = spreadsheet.insertSheet(data.className);
        const headers = ["Timestamp", "Nama Siswa", "Tanggal Kegiatan", "Ibadah 1", "Ibadah 2", "Ibadah 3", "Ibadah 4", "Ibadah 5", "Ibadah 6", "Ibadah 7", "Bangun Pagi", "Tidur Cepat", "Olahraga", "Tempat Belajar", "Materi yang Dipelajari", "Karbo", "Sayur/Buah", "Susu", "Bermasyarakat"];
        classSheet.appendRow(headers);
    }
    const newRow = [new Date(), data.studentName, ...data.values];
    classSheet.appendRow(newRow);
    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleUpdateData(data) {
    try {
        const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(data.kelas);
        if (!sheet) throw new Error("Sheet kelas tidak ditemukan.");
        const sheetRowIndex = parseInt(data.rowIndex);
        sheet.getRange(sheetRowIndex, 1, 1, data.values.length).setValues([data.values]);
        return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    } catch (error) { 
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.message })).setMimeType(ContentService.MimeType.JSON);
    }
}

function handleDeleteData(data) {
    try {
        const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(data.kelas);
        if (!sheet) throw new Error("Sheet kelas tidak ditemukan.");
        const sheetRowIndex = parseInt(data.rowIndex);
        sheet.deleteRow(sheetRowIndex);
        return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    } catch (error) { 
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.message })).setMimeType(ContentService.MimeType.JSON);
    }
}

function handleGetSiswaNameByInduk(e) {
  try {
    const noInduk = e.parameter.induk;
    const siswaData = sheetSiswa.getRange("B2:C" + sheetSiswa.getLastRow()).getValues();
    for (let i = 0; i < siswaData.length; i++) {
      if (siswaData[i][0].toString() === noInduk) {
        return ContentService
          .createTextOutput(JSON.stringify({ status: "success", nama: siswaData[i][1] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: "No. Induk tidak ditemukan" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleGetSiswaDataByInduk(e) {
  try {
    const noInduk = e.parameter.induk;
    const siswaData = sheetSiswa.getDataRange().getValues();
    for (let i = 1; i < siswaData.length; i++) {
      if (siswaData[i][1].toString() === noInduk) {
        let data = {
          no: siswaData[i][0],
          induk: siswaData[i][1],
          nama: siswaData[i][2],
          agama: siswaData[i][3],
          kelas: siswaData[i][4]
        };
        return ContentService
          .createTextOutput(JSON.stringify({ status: "success", data: data }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
     return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: "Data siswa tidak ditemukan" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
     return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleReadAll() {
    const dataAdminGuru = sheetAdminGuru.getRange("A2:F" + sheetAdminGuru.getLastRow()).getValues();
    const dataSiswa = sheetSiswa.getRange("A2:E" + sheetSiswa.getLastRow()).getValues();
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "success",
        adminGuru: dataAdminGuru.filter(row => row[0] !== ''),
        siswa: dataSiswa.filter(row => row[0] !== '')
      }))
      .setMimeType(ContentService.MimeType.JSON);
}

function handleUpdateSchoolInfo(data) {
  try {
    const values = data.values;
    sheetAdminGuru.getRange("I2").setValue(values["NAMA Sekolah"]);
    sheetAdminGuru.getRange("J2").setValue(values["NPSN"]);
    sheetAdminGuru.getRange("K2").setValue(values["Alamat"]);
    sheetAdminGuru.getRange("L2").setValue(values["Jenjang"]);
    sheetAdminGuru.getRange("M2").setValue(values["Url Logo Sekolah"]);
    sheetAdminGuru.getRange("N2").setValue(values["Nama Kepala Sekolah"]);
    sheetAdminGuru.getRange("O2").setValue(values["NIP Kepala Sekolah"]);
    sheetAdminGuru.getRange("P2").setValue(values["Nomor HP Admin"]);
    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function createClassSheetIfNotExists(className) {
  if (!className || typeof className !== 'string' || className.trim() === '') return;
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(className.trim());
  if (!sheet) {
    sheet = spreadsheet.insertSheet(className.trim());
    const headers = [ "Timestamp", "Nama Siswa", "Tanggal Kegiatan", "Ibadah 1", "Ibadah 2", "Ibadah 3", "Ibadah 4", "Ibadah 5", "Ibadah 6", "Ibadah 7", "Bangun Pagi", "Tidur Cepat", "Olahraga", "Tempat Belajar", "Materi yang Dipelajari", "Karbo", "Sayur/Buah", "Susu", "Bermasyarakat" ];
    sheet.appendRow(headers);
    sheet.getRange("A1:S1").protect().setDescription('Header Dilindungi').setWarningOnly(true);
    sheet.setFrozenRows(1);
  }
}

function handleCreate(data) {
    try {
        if (data.type === "adminGuru") {
          sheetAdminGuru.appendRow(data.values);
          const className = data.values[5];
          createClassSheetIfNotExists(className);
        } else if (data.type === "siswa") {
          sheetSiswa.appendRow(data.values);
        }
        return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    } catch (error) { 
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.message })).setMimeType(ContentService.MimeType.JSON);
    }
}

function handleUpdate(data) {
    try {
        const sheet = data.type === "adminGuru" ? sheetAdminGuru : sheetSiswa;
        sheet.getRange(data.rowIndex, 1, 1, data.values.length).setValues([data.values]);
        if (data.type === "adminGuru") {
          const className = data.values[5];
          createClassSheetIfNotExists(className);
        }
        return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    } catch (error) { 
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.message })).setMimeType(ContentService.MimeType.JSON);
    }
}

function handleDelete(data) {
    try {
        const sheet = data.type === "adminGuru" ? sheetAdminGuru : sheetSiswa;
        sheet.deleteRow(data.rowIndex);
        return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    } catch (error) { 
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.message })).setMimeType(ContentService.MimeType.JSON);
    }
}