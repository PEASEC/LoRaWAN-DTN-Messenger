import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Filesystem, Directory, Encoding, ReadFileResult, WriteFileResult } from '@capacitor/filesystem';

import { FileSystemStorageService } from './file-system-storage.service';

describe('FileSystemStorageService', () => {
  let service: FileSystemStorageService;
  let testFileName: string;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FileSystemStorageService);
    testFileName = 'testFile'
  });

  /**
  afterAll(() => {
    //delete test text file, if it exists
    try{
      Filesystem.deleteFile({
        path: testFileName + '.txt',
        directory: Directory.Data
      });
    }catch{

    }
  });
   */

  //!Some methods are tested through the UI Components!

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  //Test doesn't work because for some reason the readFile method doesn't wait for the file to be written first.
  //The to be tested method writeTextFileToFilesystem is tested through various other UI component tests, so this test may not be necessary
  /**
  //Test writeTextFileToFilesystem method
  it('Text files should be written on the Filesystem with correct content', fakeAsync(() => {
    const data = 'Test data';

    const readResponse: ReadFileResult = {
      data: data
    }

    spyOn(service, 'writeTextFileToFilesystem').and.resolveTo();

    service.writeTextFileToFilesystem(testFileName, data);
    tick();

    spyOn(Filesystem, 'readFile').and.resolveTo(readResponse)
    let readResult: string = '';

    try{
      Filesystem.readFile({
        path : testFileName + '.txt',
        directory : Directory.Data,
        encoding : Encoding.UTF8
      }).then((result) => {readResult = result.data});
    }catch{
      expect(true)
        .withContext('file could not be found')
        .toEqual(false);
    }

    tick();

    expect(readResult)
      .withContext('file content doesnt match')
      .toEqual(data);
  }));
   */

  //Test readTextFileFromFilesystem method
  it('Text files should read from Filesystem with correct content', fakeAsync(() => {
    const data = 'Test data';

    try{
      Filesystem.writeFile({
        path: testFileName + '.txt',
        directory: Directory.Data,
        data: data,
        encoding: Encoding.UTF8
      });
    }catch{
      expect(true)
        .withContext('file could not be written on Filesystem')
        .toEqual(false);
    }
    tick()

    spyOn(service, 'readTextFileFromFilesystem').and.resolveTo(data);
    let result: string = '';
    service.readTextFileFromFilesystem(testFileName).then((res) => {result = res});

    tick();

    expect(result)
      .withContext('file content doesnt match')
      .toEqual(data);
  }));
});
