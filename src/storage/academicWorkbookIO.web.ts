import { AcademicImportDraft, buildAcademicTemplateArray, parseAcademicWorkbook } from '../domain/academicWorkbook';

function download(data: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function downloadAcademicTemplate(): Promise<void> {
  download(buildAcademicTemplateArray(), 'iridai-academic-import-template-v1.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

export async function selectAcademicWorkbook(): Promise<AcademicImportDraft | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    input.style.display = 'none';
    document.body.appendChild(input);
    const finish = () => input.remove();
    input.addEventListener('cancel', () => { finish(); resolve(null); }, { once: true });
    input.addEventListener('change', async () => {
      try {
        const file = input.files?.[0];
        resolve(file ? parseAcademicWorkbook(await file.arrayBuffer(), file.name) : null);
      } catch (error) { reject(error); }
      finally { finish(); }
    }, { once: true });
    input.click();
  });
}
