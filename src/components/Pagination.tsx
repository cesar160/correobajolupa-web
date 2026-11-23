import { PaginationNav } from './ui';

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
  noun = 'elementos',
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  noun?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1);

  if (total <= pageSize) return null;

  return (
    <div className="pagination">
      <span>Mostrando {from}–{to} de {total} {noun}</span>
      <PaginationNav
        page={page}
        pages={pages}
        totalPages={totalPages}
        onChange={onChange}
        label="Paginación de resultados"
      />
    </div>
  );
}
