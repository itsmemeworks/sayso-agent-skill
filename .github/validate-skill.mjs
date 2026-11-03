// Checks a skill folder against the Agent Skills specification (https://agentskills.io/specification):
// frontmatter fields and limits, the name matching its folder, and every relative link in SKILL.md existing.
import {readFileSync,existsSync} from 'node:fs';import {basename,join} from 'node:path';
const dir=process.argv[2],text=readFileSync(join(dir,'SKILL.md'),'utf8'),errors=[];
const m=text.match(/^---\n([\s\S]*?)\n---\n/);if(!m)throw new Error('SKILL.md must start with YAML frontmatter');
const field=k=>(m[1].match(new RegExp(`^${k}:\\s*(.*)$`,'m'))||[])[1]?.trim();
const name=field('name'),description=field('description'),compatibility=field('compatibility');
if(!name||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)||name.length>64)errors.push('name: 1-64 lowercase letters, numbers and single hyphens');
if(name!==basename(dir))errors.push(`name "${name}" must match the folder "${basename(dir)}"`);
if(!description||description.length>1024)errors.push('description: 1-1024 characters');
if(compatibility!==undefined&&(compatibility.length<1||compatibility.length>500))errors.push('compatibility: 1-500 characters');
for(const [,link] of text.matchAll(/\]\(((?!https?:|#)[^)]+)\)/g))if(!existsSync(join(dir,link)))errors.push(`missing linked file: ${link}`);
if(text.split('\n').length>500)errors.push('keep SKILL.md under 500 lines');
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`${name}: valid (${description.length}-character description)`);
