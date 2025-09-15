"use client";
import { useState, useMemo, useCallback } from 'react';
import { Category, Data, QueryParams, ResponseData, Results } from '@/types';
import { Skills } from './skill';
import { Openings } from './openings';
import { Slider } from './slider';

interface BaseData { categories: Data; companies: Category[]; locations: Category[]; }
interface Props { initialData: ResponseData; initialBase: BaseData; searchParams: Record<string, string | string[]> }

export default function TrendsClient({ initialData, initialBase, searchParams }: Props) {
  const [data] = useState<ResponseData>(initialData);
  const [isLoading, setLoading] = useState(false);

  const qpInit = (key: string): string[] => {
    const v = searchParams[key];
    if (!v) return [];
    return Array.isArray(v) ? v.map(s => s.toLowerCase()) : [v.toLowerCase()];
  };
  const [queryParams, setQueryParams] = useState<QueryParams>({
    languages: qpInit('languages'),
    frameworks: qpInit('frameworks'),
    databases: qpInit('databases'),
    cloud: qpInit('cloud'),
    devops: qpInit('devops'),
    dataScience: qpInit('dataScience'),
    cyberSecurity: qpInit('cyberSecurity'),
    softSkills: qpInit('softSkills'),
    positions: qpInit('positions'),
    seniority: qpInit('seniority'),
    workMode: qpInit('workMode'),
    companies: qpInit('companies'),
    locations: qpInit('locations'),
    cities: qpInit('cities'),
    salary: qpInit('salary'),
    minDate: qpInit('minDate'),
    maxDate: qpInit('maxDate'),
  });

  const baseCategories = initialBase; // already computed server-side

  const { filteredData, filteredCategories, filteredCompanies } = useMemo(() => {
    const { categories, companies, locations } = baseCategories;
    if (!data.results) return { filteredData: [], filteredCategories: {} as Data, filteredCompanies: [] };

    const clone = (c: Category) => ({ ...c, openings: c.openings, filteredOpenings: c.filteredOpenings, active: false });

    type CatProcess = { list: Category[] | undefined; selected: string[] | undefined; key: keyof Data | 'companies' | 'locations' };
    const catConfigs: CatProcess[] = [
      { list: categories.languages, selected: queryParams.languages, key: 'languages' },
      { list: categories.frameworks, selected: queryParams.frameworks, key: 'frameworks' },
      { list: categories.databases, selected: queryParams.databases, key: 'databases' },
      { list: categories.cloud, selected: queryParams.cloud, key: 'cloud' },
      { list: categories.devops, selected: queryParams.devops, key: 'devops' },
      { list: categories.dataScience, selected: queryParams.dataScience, key: 'dataScience' },
      { list: categories.cyberSecurity, selected: queryParams.cyberSecurity, key: 'cyberSecurity' },
      { list: categories.softSkills, selected: queryParams.softSkills, key: 'softSkills' },
      { list: categories.positions, selected: queryParams.positions, key: 'positions' },
      { list: categories.seniority, selected: queryParams.seniority, key: 'seniority' },
      { list: categories.workMode, selected: queryParams.workMode, key: 'workMode' },
      { list: categories.cities, selected: queryParams.cities, key: 'cities' },
      { list: categories.salary, selected: queryParams.salary, key: 'salary' },
      { list: companies, selected: queryParams.companies, key: 'companies' },
      { list: locations, selected: queryParams.locations, key: 'locations' },
    ];

    const processed: Record<string, Category[]> = {};
    const activeSets: Results[][] = [];

    for (const cfg of catConfigs) {
      if (!cfg.list) { processed[cfg.key] = []; continue; }
      const selectedLower = (cfg.selected || []).map(s => s.toLowerCase());
      const arr = cfg.list.map(item => {
        const active = selectedLower.includes(item.label.toLowerCase());
        if (active) activeSets.push(item.openings);
        return { ...clone(item), active };
      });
      processed[cfg.key] = arr;
    }

    function intersectArrays(arrays: Results[][]): Results[] {
      if (!arrays.length) return data.results;
      arrays.sort((a,b)=> a.length - b.length);
      let result = arrays[0];
      for (let i=1;i<arrays.length;i++) {
        const set = new Set(arrays[i]);
        result = result.filter(o => set.has(o));
        if (!result.length) break;
      }
      return result;
    }

    const openings = intersectArrays(activeSets);
    const openingsSet = openings === data.results ? null : new Set(openings);

    function attachFiltered(list: Category[]) {
      return list.map(item => ({
        ...item,
        filteredOpenings: openingsSet ? item.openings.filter(o => openingsSet.has(o)) : item.openings,
      }));
    }

    const filteredCategories: Data = {
      languages: attachFiltered(processed.languages),
      frameworks: attachFiltered(processed.frameworks),
      databases: attachFiltered(processed.databases),
      cloud: attachFiltered(processed.cloud),
      devops: attachFiltered(processed.devops),
      dataScience: attachFiltered(processed.dataScience),
      softSkills: attachFiltered(processed.softSkills),
      cyberSecurity: attachFiltered(processed.cyberSecurity),
      positions: attachFiltered(processed.positions),
      seniority: attachFiltered(processed.seniority),
      workMode: attachFiltered(processed.workMode),
      cities: attachFiltered(processed.cities),
      salary: attachFiltered(processed.salary),
    };

    const filteredCompanies = attachFiltered(processed.companies);

    return { filteredData: openings, filteredCategories, filteredCompanies, filteredLocations: attachFiltered(processed.locations) };
  }, [baseCategories, queryParams, data.results]);

  const updateFilter = useCallback((filter: string, value: string) => {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    const isSingleValue = filter === 'minDate' || filter === 'maxDate';
    if (isSingleValue) {
      if (params.get(filter) === value) params.delete(filter); else params.set(filter, value);
    } else {
      const existing = params.getAll(filter);
      if (existing.includes(value)) {
        const remaining = existing.filter((v) => v !== value);
        params.delete(filter);
        remaining.forEach((v) => params.append(filter, v));
      } else {
        params.append(filter, value);
      }
    }
    setQueryParams(prev => ({ ...prev, [filter]: params.getAll(filter).map(v => v.toLowerCase()) }));
    url.search = params.toString();
    window.history.pushState({}, '', url.toString());
  }, []);

  function filterByDate(min: Date, max: Date) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const minStr = `${min.getFullYear()}-${pad(min.getMonth() + 1)}-${pad(min.getDate())}`;
    const maxStr = `${max.getFullYear()}-${pad(max.getMonth() + 1)}-${pad(max.getDate())}`;
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    if (params.get('minDate') === minStr) params.delete('minDate'); else params.set('minDate', minStr);
    if (params.get('maxDate') === maxStr) params.delete('maxDate'); else params.set('maxDate', maxStr);
    setQueryParams(prev => ({ ...prev, minDate: params.getAll('minDate'), maxDate: params.getAll('maxDate') }));
    url.search = params.toString();
    window.history.pushState({}, '', url.toString());
  }

  if (isLoading) {
    return <div className="max-w-7xl mx-auto px-3 md:px-6 lg:px-8">Loading...</div>;
  }

  return (
    <div className={'max-w-7xl mx-auto px-1 md:px-6 lg:px-8'}>
      <div>
        <div className={'flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between pt-4'}>
          <h1 className="text-2xl md:text-3xl font-semibold">Job Listings ({filteredData.length})</h1>
          <h3 className={'text-[11px] xs:text-xs sm:text-sm md:text-base lg:text-lg line-clamp-4 text-gray-400'}>
            Source duunitori.fi/api/v1/jobentries?search=Tieto- ja tietoliikennetekniikka (ala)
          </h3>
          <h3 className="text-sm text-gray-300">Date {new Date().toLocaleDateString('fi-FI')}</h3>
        </div>
        <div className="mt-3 mx-1 md:mx-2">
          <Slider
            min={new Date('09/01/2025')}
            filteredData={filteredData}
            filterByDate={filterByDate}
            initialMinDate={queryParams.minDate[0] ? new Date(queryParams.minDate[0]) : null}
            initialMaxDate={queryParams.maxDate[0] ? new Date(queryParams.maxDate[0]) : null}
          />
        </div>
        <div className={'mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6'}>
          <div><h2 className="text-sm font-semibold mb-1">Languages</h2><Skills skills={filteredCategories.languages} category={'languages'} setLoading={setLoading} updateFilter={updateFilter} /></div>
          <div><h2 className="text-sm font-semibold mb-1">Frameworks</h2><Skills skills={filteredCategories.frameworks} category={'frameworks'} setLoading={setLoading} updateFilter={updateFilter} /></div>
          <div><h2 className="text-sm font-semibold mb-1">Databases</h2><Skills skills={filteredCategories.databases} category={'databases'} setLoading={setLoading} updateFilter={updateFilter} /></div>
          <div><h2 className="text-sm font-semibold mb-1">Cloud</h2><Skills skills={filteredCategories.cloud} category={'cloud'} setLoading={setLoading} updateFilter={updateFilter} /></div>
            <div><h2 className="text-sm font-semibold mb-1">DevOps</h2><Skills skills={filteredCategories.devops} category={'devops'} setLoading={setLoading} updateFilter={updateFilter} /></div>
            <div><h2 className="text-sm font-semibold mb-1">Cyber Security</h2><Skills skills={filteredCategories.cyberSecurity} category={'cyberSecurity'} setLoading={setLoading} updateFilter={updateFilter} /></div>
            <div><h2 className="text-sm font-semibold mb-1">Data Science</h2><Skills skills={filteredCategories.dataScience} category={'dataScience'} setLoading={setLoading} updateFilter={updateFilter} /></div>
            <div><h2 className="text-sm font-semibold mb-1">Role</h2><Skills skills={filteredCategories.positions} category={'positions'} setLoading={setLoading} updateFilter={updateFilter} /></div>
            <div><h2 className="text-sm font-semibold mb-1">Seniority</h2><Skills skills={filteredCategories.seniority} category={'seniority'} setLoading={setLoading} updateFilter={updateFilter} /></div>
            <div><h2 className="text-sm font-semibold mb-1">Soft Skills</h2><Skills skills={filteredCategories.softSkills} category={'softSkills'} setLoading={setLoading} updateFilter={updateFilter} /></div>
            <div><h2 className="text-sm font-semibold mb-1">Companies</h2><Skills skills={filteredCompanies} category={'companies'} setLoading={setLoading} updateFilter={updateFilter} /></div>
            <div><h2 className="text-sm font-semibold mb-1">Location</h2><Skills skills={filteredCategories.cities || null} category={'cities'} setLoading={setLoading} updateFilter={updateFilter} /></div>
            <div><h2 className="text-sm font-semibold mb-1">Work Mode</h2><Skills skills={filteredCategories.workMode || null} category={'workMode'} setLoading={setLoading} updateFilter={updateFilter} /></div>
            <div><h2 className="text-sm font-semibold mb-1">Salary</h2><Skills skills={filteredCategories.salary || null} category={'salary'} setLoading={setLoading} updateFilter={updateFilter} /></div>
        </div>
      </div>
      <Openings openings={filteredData} activeQuery={queryParams} />
      <hr className={'my-8 border-gray-400'} />
      <footer className={'flex flex-col sm:flex-row justify-between items-center'}>
        <div className={'text-gray-400 max-w-xl'}>
          <h3>How does this work?</h3>
          <p className={'py-2'}>
            The next.js app fetches data from <a href={'https://duunitori.fi/api/v1/jobentries?ohjelmointi+ja+ohjelmistokehitys+(ala)'}>duunitori.fi</a> public API and tries to match selected keywords from the job listing descriptions. Regex matching. Source: <a href={'https://github.com/Jeb4dev/tech-trends'}>github.com/Jeb4dev/tech-trends</a>
          </p>
        </div>
        <div className={'text-gray-400 max-w-lg'}>
          <h3 className={'py-2'}>Disclaimer</h3>
          <p>The data is not 100% accurate. Not affiliated with duunitori.fi.</p>
        </div>
      </footer>
    </div>
  );
}
