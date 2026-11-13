import api from './axios';

export async function ambilSemuaHalaman<T = any>(
  baseUrlWithParams: string,
  maxPages = 100
): Promise<T[]> {
  const separator = baseUrlWithParams.includes('?') ? '&' : '?';
  const firstUrl = `${baseUrlWithParams}${separator}page=1`;
  const firstRes = await api.get(firstUrl);

  const initialData: T[] = Array.isArray(firstRes.data?.data)
    ? firstRes.data.data
    : Array.isArray(firstRes.data)
      ? firstRes.data
      : [];

  const lastPage = firstRes.data?.meta?.last_page || firstRes.data?.last_page || 1;

  if (lastPage <= 1) {
    return initialData;
  }

  const allData = [...initialData];
  const pagesToFetch = Math.min(lastPage, maxPages);

  for (let page = 2; page <= pagesToFetch; page++) {
    const pageUrl = `${baseUrlWithParams}${separator}page=${page}`;
    const pageRes = await api.get(pageUrl);
    const pageData: T[] = Array.isArray(pageRes.data?.data)
      ? pageRes.data.data
      : [];
    allData.push(...pageData);
  }

  return allData;
}
