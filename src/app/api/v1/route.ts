"use server";

import { ResponseData } from "@/types";
import { NextResponse } from "next/server";

let data: ResponseData;
async function fetchData() {
  let url = "https://duunitori.fi/api/v1/jobentries?format=json&search=Tieto-+ja+tietoliikennetekniikka%28ala%29";

  while (true) {
    const response = await fetch(url);
    const newData: ResponseData = await response.json();
    if (!newData.next) break;
    data = data != null ? { ...data, results: data.results.concat(newData.results), next: newData.next } : newData;
    url = newData.next;
  }
  data.results = data.results.filter((v, i, a) => a.findIndex(t => (t.slug === v.slug)) === i);
}

export async function GET() {

  if (data) return NextResponse.json({ data });

  await fetchData();

  return NextResponse.json({ data });
}
