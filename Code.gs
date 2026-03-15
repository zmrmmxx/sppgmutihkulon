// ==========================================
// BACKEND GOOGLE APPS SCRIPT - SPPG MUTIH KULON
// ==========================================

function getDB() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function initializeDatabase() {
  const ss = getDB();
  
  const defaultSheets = [
    {
      name: 'Users',
      headers: ['ID', 'Username', 'PasswordHash', 'Role', 'CreatedAt'],
      data: [
        ['U001', 'admin', hashPassword('1234'), 'Admin', new Date()]
      ]
    },
    {
      name: 'Sekolah',
      headers: ['ID', 'NamaSekolah', 'Alamat', 'Kategori', 'JumlahSiswa', 'CreatedAt'],
      data: []
    },
    {
      name: 'Menu',
      headers: ['ID', 'Hari', 'NamaMenu', 'Kalori', 'Protein', 'Karbohidrat', 'Lemak', 'Vitamin', 'Keterangan', 'CreatedAt'],
      data: []
    },
    {
      name: 'Bahan',
      headers: ['ID', 'NamaBahan', 'Kategori', 'Stok', 'Satuan', 'UpdatedAt'],
      data: []
    },
    {
      name: 'Distribusi',
      headers: ['ID', 'Tanggal', 'SekolahID', 'MenuID', 'JumlahPorsi', 'CreatedAt'],
      data: []
    },
    {
      name: 'Karyawan',
      headers: ['ID', 'Nama', 'Jabatan', 'NoHP', 'CreatedAt'],
      data: []
    },
    {
      name: 'Logs',
      headers: ['Tanggal', 'User', 'Action', 'Data'],
      data: []
    },
    {
      name: 'Config',
      headers: ['ProgramName', 'AlamatProgram', 'KaloriMinimal', 'ProteinMinimal', 'LogoURL'],
      data: [
        ['SPPG MUTIH KULON', 'Mutih Kulon, Kecamatan Wedung, Kabupaten Demak', 500, 15, 'https://i.ibb.co.com/8gDNvQZV/download-removebg-preview.png']
      ]
    }
  ];

  defaultSheets.forEach(sheetDef => {
    let sheet = ss.getSheetByName(sheetDef.name);
    if (!sheet) {
      sheet = ss.insertSheet(sheetDef.name);
      sheet.appendRow(sheetDef.headers);
      
      // Format header
      const headerRange = sheet.getRange(1, 1, 1, sheetDef.headers.length);
      headerRange.setFontWeight("bold").setBackground("#f3f4f6");
      sheet.setFrozenRows(1);
      
      if (sheetDef.data && sheetDef.data.length > 0) {
        sheet.getRange(2, 1, sheetDef.data.length, sheetDef.data[0].length).setValues(sheetDef.data);
      }
    }
  });

  // Hapus Sheet1 bawaan jika ada
  const sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 1) {
    ss.deleteSheet(sheet1);
  }
  
  return "Database berhasil diinisialisasi!";
}

function hashPassword(password) {
  const signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  let hash = '';
  for (let i = 0; i < signature.length; i++) {
    let byte = signature[i];
    if (byte < 0) byte += 256;
    let byteStr = byte.toString(16);
    if (byteStr.length == 1) byteStr = '0' + byteStr;
    hash += byteStr;
  }
  return hash;
}

function verifyLogin(username, password) {
  const ss = getDB();
  const userSheet = ss.getSheetByName('Users');
  if (!userSheet) return { status: 'error', message: 'Database belum diinisialisasi. Silakan hubungi administrator.' };

  const data = userSheet.getDataRange().getValues();
  const passwordHash = hashPassword(password);

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === username && data[i][2] === passwordHash) {
      const token = Utilities.getUuid();
      
      // Catat log
      logAction(username, 'Login', 'User logged in successfully');
      
      return {
        status: 'success',
        data: {
          user: {
            id: data[i][0],
            username: data[i][1],
            role: data[i][3]
          },
          token: token
        }
      };
    }
  }
  
  return { status: 'error', message: 'Username atau password salah.' };
}

function logAction(user, action, dataStr) {
  try {
    const sheet = getDB().getSheetByName('Logs');
    if (sheet) {
      sheet.appendRow([new Date(), user, action, dataStr]);
    }
  } catch (e) {
    // Ignore log errors
  }
}

function doGet(e) {
  // If ?page=print is present in Query Params, render the Print.html Template
  if (e.parameter.page === 'print') {
      const template = HtmlService.createTemplateFromFile('Print');
      
      const today = new Date();
      const tercetak = [today.getDate().toString().padStart(2,'0'), (today.getMonth()+1).toString().padStart(2,'0'), today.getFullYear()].join('/');
      
      // Pass the query parameters directly to the template
      template.printData = {
          tanggal: e.parameter.tanggal || '-',
          sekolah: e.parameter.sekolah || '-',
          menu: e.parameter.menu || '-',
          buah: e.parameter.buah || '-',
          karbohidrat: e.parameter.karbohidrat || '0',
          protein: e.parameter.protein || '0',
          lemak: e.parameter.lemak || '0',
          kalori: e.parameter.kalori || '0',
          vitamin: e.parameter.vitamin || '-',
          sppg: e.parameter.sppg || '.........................',
          gizi: e.parameter.gizi || '.........................',
          penerima: e.parameter.penerima || '.........................',
          tercetak: tercetak
      };
      
      return template.evaluate().setTitle('Cetak Laporan - SPPG');
  }

  // Default Entry Point
  const template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
      .setTitle('SPPG Mutih Kulon')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ==========================================
// CRUD GENERIC HELPERS
// ==========================================

function generateId(prefix) {
  return prefix + Date.now() + Math.floor(Math.random() * 1000);
}

function readSheetData(sheetName) {
  const ss = getDB();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Only headers
  
  const headers = data[0];
  const result = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
       obj[headers[j]] = row[j];
    }
    obj.rowIndex = i + 1; // Google Sheets is 1-indexed
    result.push(obj);
  }
  
  return result;
}

// ==========================================
// CRUD SEKOLAH
// ==========================================

function getSekolah() {
  return { status: 'success', data: readSheetData('Sekolah') };
}

function saveSekolah(data, username) {
  const ss = getDB();
  const sheet = ss.getSheetByName('Sekolah');
  
  if (data.id) {
    // Update
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        sheet.getRange(i + 1, 2, 1, 5).setValues([[
          data.nama, data.alamat, data.kategori, data.porsi, data.siswa
        ]]);
        if(username) logAction(username, 'UPDATE_SEKOLAH', `Updated ${data.nama}`);
        return { status: 'success', message: 'Data Sekolah berhasil diperbarui.' };
      }
    }
  } else {
    // Insert
    const newId = generateId('SKL');
    sheet.appendRow([newId, data.nama, data.alamat, data.kategori, data.porsi, data.siswa, new Date()]);
    if(username) logAction(username, 'ADD_SEKOLAH', `Added ${data.nama}`);
    return { status: 'success', message: 'Data Sekolah berhasil ditambahkan.' };
  }
}

function deleteSekolah(id, username) {
  const ss = getDB();
  const sheet = ss.getSheetByName('Sekolah');
  const rows = sheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      const deletedName = rows[i][1];
      sheet.deleteRow(i + 1);
      if(username) logAction(username, 'DELETE_SEKOLAH', `Deleted ${deletedName} (${id})`);
      return { status: 'success', message: 'Data Sekolah berhasil dihapus.' };
    }
  }
  return { status: 'error', message: 'Data tidak ditemukan.' };
}

// ==========================================
// CRUD MENU
// ==========================================

function getMenu() {
  return { status: 'success', data: readSheetData('Menu') };
}

function saveMenu(data, username) {
  const ss = getDB();
  const sheet = ss.getSheetByName('Menu');
  
  if (data.id) {
    // Update
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
         // Assuming 'buah' is appended to column 10 (idx 9)
         sheet.getRange(i + 1, 2, 1, 9).setValues([[
           data.tanggal, data.nama, data.kalori, data.protein, data.karbo, data.lemak, data.vitamin, data.keterangan, data.buah
         ]]);
         if(username) logAction(username, 'UPDATE_MENU', `Updated ${data.nama}`);
         return { status: 'success', message: 'Menu berhasil diperbarui.' };
      }
    }
  } else {
    // Insert
    // Column order: [id, tanggal, nama, kalori, protein, karbo, lemak, vitamin, keterangan, buah, timestamp]
    const newId = generateId('MNU');
    sheet.appendRow([newId, data.tanggal, data.nama, data.kalori, data.protein, data.karbo, data.lemak, data.vitamin, data.keterangan, data.buah, new Date()]);
    if(username) logAction(username, 'ADD_MENU', `Added ${data.nama}`);
    return { status: 'success', message: 'Menu berhasil ditambahkan.' };
  }
}

function deleteMenu(id, username) {
  const ss = getDB();
  const sheet = ss.getSheetByName('Menu');
  const rows = sheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      const deletedName = rows[i][2];
      sheet.deleteRow(i + 1);
      if(username) logAction(username, 'DELETE_MENU', `Deleted ${deletedName} (${id})`);
      return { status: 'success', message: 'Menu berhasil dihapus.' };
    }
  }
  return { status: 'error', message: 'Data tidak ditemukan.' };
}

// ==========================================
// CRUD BAHAN
// ==========================================

function getBahan() {
  return { status: 'success', data: readSheetData('Bahan') };
}

function saveBahan(data, username) {
  const ss = getDB();
  const sheet = ss.getSheetByName('Bahan');
  
  if (data.id) {
    // Update
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
         sheet.getRange(i + 1, 2, 1, 5).setValues([[
           data.nama, data.kategori, data.stok, data.satuan, new Date()
         ]]);
         if(username) logAction(username, 'UPDATE_BAHAN_STOK', `Updated ${data.nama} to ${data.stok} ${data.satuan}`);
         return { status: 'success', message: 'Stok Bahan berhasil diperbarui.' };
      }
    }
  } else {
    // Insert
    const newId = generateId('BHN');
    sheet.appendRow([newId, data.nama, data.kategori, data.stok, data.satuan, new Date()]);
    if(username) logAction(username, 'ADD_BAHAN', `Added ${data.nama}`);
    return { status: 'success', message: 'Bahan baru berhasil ditambahkan.' };
  }
}

function deleteBahan(id, username) {
  const ss = getDB();
  const sheet = ss.getSheetByName('Bahan');
  const rows = sheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      const deletedName = rows[i][1];
      sheet.deleteRow(i + 1);
      if(username) logAction(username, 'DELETE_BAHAN', `Deleted ${deletedName} (${id})`);
      return { status: 'success', message: 'Bahan berhasil dihapus.' };
    }
  }
  return { status: 'error', message: 'Data tidak ditemukan.' };
}

// ==========================================
// CRUD DISTRIBUSI
// ==========================================

function getDistribusi() {
  const result = readSheetData('Distribusi');
  // Format the date properly before sending to frontend
  const formatted = result.map(item => {
    if(item.Tanggal instanceof Date) {
      const d = item.Tanggal;
      const month = '' + (d.getMonth() + 1);
      const day = '' + d.getDate();
      const year = d.getFullYear();
      item.TanggalTampil = [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
    } else {
      item.TanggalTampil = item.Tanggal;
    }
    return item;
  });
  
  // Need to provide options for dropdowns too
  const sekolah = readSheetData('Sekolah');
  const menu = readSheetData('Menu');
  
  return { 
      status: 'success', 
      data: { 
          distribusi: formatted.reverse(), // latest first
          options: { sekolah: sekolah, menu: menu } 
      } 
  };
}

function saveDistribusi(data, username) {
  const ss = getDB();
  const sheet = ss.getSheetByName('Distribusi');
  
  // Resolve ID to Names for easier lookup in sheet
  let sekolahName = data.sekolahId;
  let menuName = data.menuId;
  
  const sekolahSheet = readSheetData('Sekolah').find(s => s.ID === data.sekolahId);
  const menuSheet = readSheetData('Menu').find(m => m.ID === data.menuId);
  
  if(sekolahSheet) sekolahName = sekolahSheet.NamaSekolah;
  if(menuSheet) menuName = menuSheet.NamaMenu;

  if (data.id) {
    // Update
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
         sheet.getRange(i + 1, 2, 1, 4).setValues([[
           data.tanggal, sekolahName, menuName, data.porsi
         ]]);
         if(username) logAction(username, 'UPDATE_DISTRIBUSI', `Update Dist: ${sekolahName} - ${menuName} (${data.porsi} porsi)`);
         return { status: 'success', message: 'Catatan distribusi berhasil diperbarui.' };
      }
    }
  } else {
    // Insert
    const newId = generateId('DST');
    sheet.appendRow([newId, data.tanggal, sekolahName, menuName, data.porsi, new Date()]);
    if(username) logAction(username, 'ADD_DISTRIBUSI', `Dist: ${sekolahName} - ${menuName} (${data.porsi} porsi)`);
    return { status: 'success', message: 'Penyaluran berhasil dicatat.' };
  }
}

function deleteDistribusi(id, username) {
  const ss = getDB();
  const sheet = ss.getSheetByName('Distribusi');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      sheet.deleteRow(i + 1);
      if(username) logAction(username, 'DELETE_DISTRIBUSI', `Deleted record (${id})`);
      return { status: 'success', message: 'Rekam distribusi dihapus.' };
    }
  }
  return { status: 'error', message: 'Data tidak ditemukan.' };
}

// ==========================================
// CRUD KARYAWAN
// ==========================================

function getKaryawan() {
  return { status: 'success', data: readSheetData('Karyawan') };
}

function saveKaryawan(data, username) {
  const ss = getDB();
  const sheet = ss.getSheetByName('Karyawan');
  
  if (data.id) {
    // Update
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
         sheet.getRange(i + 1, 2, 1, 3).setValues([[
           data.nama, data.jabatan, data.nohp
         ]]);
         if(username) logAction(username, 'UPDATE_KARYAWAN', `Updated Karyawan: ${data.nama}`);
         return { status: 'success', message: 'Data karyawan berhasil diperbarui.' };
      }
    }
  } else {
    // Insert
    const newId = generateId('KRY');
    sheet.appendRow([newId, data.nama, data.jabatan, data.nohp, new Date()]);
    if(username) logAction(username, 'ADD_KARYAWAN', `Added Karyawan: ${data.nama}`);
    return { status: 'success', message: 'Data karyawan berhasil ditambahkan.' };
  }
}

function deleteKaryawan(id, username) {
  const ss = getDB();
  const sheet = ss.getSheetByName('Karyawan');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      const deletedName = rows[i][1];
      sheet.deleteRow(i + 1);
      if(username) logAction(username, 'DELETE_KARYAWAN', `Deleted Karyawan: ${deletedName} (${id})`);
      return { status: 'success', message: 'Data karyawan dihapus.' };
    }
  }
  return { status: 'error', message: 'Data tidak ditemukan.' };
}
