export interface Paging {
  page: number;
  pages: number;
  items: number;
}

export type ResponseWithPagination<D> = {
  paging: Paging;
  data: D[];
};
