import * as path from 'path';

const i = require('i')();

const extensions = ['.js', '.hbs', '.handlebars'];

export abstract class FileInfo {
  protected _toString: string;

  static from(relativePath: string): FileInfo | undefined {
    let ext = path.extname(relativePath);
    if (!extensions.includes(ext)) {
      return;
    }

    let pathParts = relativePath.split('/');
    let sourceRoot = pathParts[0];

    if (sourceRoot === 'app') {
      if (pathParts.length === 2) {
        // handle files in the source root
        return new MainFileInfo(relativePath, pathParts);
      }

      if (ext === '.hbs') {
        return new TemplateFileInfo(relativePath, pathParts);
      }

      return new ModuleFileInfo(relativePath, pathParts);

    } else if (sourceRoot === 'tests') {
      let type = pathParts[1];
      if (type === 'integration' || type === 'unit') {
        return new ModuleTestFileInfo(relativePath, pathParts, type);
      } else if (type === 'acceptance') {
        return new AcceptanceTestFileInfo(relativePath, pathParts);
      }
    }
  }

  constructor(public readonly relativePath: string) {}

  get containerName(): string | undefined {
    return undefined;
  }

  toString(): string {
    return this._toString;
  }
}

export class MainFileInfo extends FileInfo {
  readonly name: string;

  constructor(relativePath: string, pathParts: string[]) {
    super(relativePath);

    this.name = removeExtension(pathParts)[1];
    this._toString = this.name;
  }

  get containerName(): string {
    return `main:${this.name}`;
  }
}

export class TemplateFileInfo extends FileInfo {
  readonly forComponent: boolean;
  readonly name: string;
  readonly slashName: string;

  constructor(relativePath: string, pathParts: string[]) {
    super(relativePath);

    this.forComponent = (pathParts[2] === 'components');

    let nameParts = removeExtension(pathParts.slice(this.forComponent ? 3 : 2));
    this.name = nameParts.join('.');
    this.slashName = nameParts.join('/');

    this._toString = `${this.name} ${this.forComponent ? 'component-template' : 'template'}`;
  }
}

export class ModuleFileInfo extends FileInfo {
  readonly type: string;
  readonly name: string;
  readonly slashName: string;

  constructor(relativePath: string, pathParts: string[]) {
    super(relativePath);

    let topLevelDirectory = pathParts[1];
    this.type = i.singularize(topLevelDirectory);

    let nameParts = removeExtension(pathParts.slice(2));
    this.name = nameParts.join('.');
    this.slashName = nameParts.join('/');

    this._toString = `${this.name} ${this.type}`;
  }

  get containerName(): string {
    return `${this.type}:${this.name}`;
  }
}

abstract class TestFileInfo extends FileInfo {}

export class ModuleTestFileInfo extends TestFileInfo {
  readonly subjectType: string;
  readonly name: string;
  readonly slashName: string;

  constructor(relativePath: string, pathParts: string[], public readonly type: string) {
    super(relativePath);

    let topLevelDirectory = pathParts[2];
    this.subjectType = i.singularize(topLevelDirectory);

    let nameParts = removeExtension(pathParts.slice(3));
    this.name = nameParts.join('.');
    this.slashName = nameParts.join('/');

    let typeSuffix = `${this.subjectType}-`;
    if (this.subjectType === 'component' && this.type === 'unit') {
      typeSuffix += '-unit';
    } else if (this.subjectType !== 'component' && this.type === 'integration') {
      typeSuffix += '-integration';
    }
    typeSuffix += '-test';

    this._toString = `${this.name} ${typeSuffix}`;
  }
}

export class AcceptanceTestFileInfo extends TestFileInfo {
  readonly name: string;
  readonly slashName: string;

  constructor(relativePath: string, pathParts: string[]) {
    super(relativePath);

    let nameParts = removeExtension(pathParts.slice(2));
    this.name = nameParts.join('.');
    this.slashName = nameParts.join('/');

    this._toString = `${this.name} acceptance-test`;
  }
}

function removeExtension(nameParts: string[]) {
  let baseName = nameParts.pop() as string;
  let extension = path.extname(baseName);
  nameParts.push(baseName.substr(0, baseName.length - extension.length));
  return nameParts;
}
