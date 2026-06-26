import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function uniqueStrings(values: unknown[]): string[] {
  return [...new Set(values.map((v) => String(v).trim()).filter(Boolean))]
}

function resolveLocationFields(
  municipio: string | undefined,
  school_name: string | undefined,
  school_id: string | undefined,
  municipios: unknown,
  school_names: unknown,
  school_ids: unknown,
) {
  let resolvedMunicipios = Array.isArray(municipios)
    ? uniqueStrings(municipios)
    : municipio?.trim()
      ? [municipio.trim()]
      : []

  let resolvedSchoolNames = Array.isArray(school_names)
    ? uniqueStrings(school_names)
    : school_name?.trim()
      ? [school_name.trim()]
      : []

  let resolvedSchoolIds = Array.isArray(school_ids)
    ? [...new Set((school_ids as string[]).filter(Boolean))]
    : school_id
      ? [school_id]
      : []

  return { resolvedMunicipios, resolvedSchoolNames, resolvedSchoolIds }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      user_id,
      email,
      password,
      full_name,
      role,
      municipio,
      school_name,
      school_id,
      turmas,
      municipios,
      school_names,
      school_ids,
    } = await req.json()

    if (!user_id || !full_name || !role) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: user_id, full_name, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const validRoles = ['root', 'admin', 'professor', 'aluno']
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Role inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user: caller } } = await supabaseUser.auth.getUser()
    if (!caller) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, email')
      .eq('id', user_id)
      .single()

    if (!callerProfile || !targetProfile) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (targetProfile.role === 'root') {
      return new Response(
        JSON.stringify({ error: 'Não é permitido editar usuário root' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (callerProfile.role === 'admin') {
      if (targetProfile.role !== 'professor') {
        return new Response(
          JSON.stringify({ error: 'Admin só pode editar professores' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      if (role !== 'professor') {
        return new Response(
          JSON.stringify({ error: 'Admin só pode manter perfil professor' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    } else if (callerProfile.role !== 'root') {
      return new Response(
        JSON.stringify({ error: 'Sem permissão' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (role === 'root' && callerProfile.role !== 'root') {
      return new Response(
        JSON.stringify({ error: 'Apenas root pode atribuir perfil root' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let { resolvedMunicipios, resolvedSchoolNames, resolvedSchoolIds } = resolveLocationFields(
      municipio,
      school_name,
      school_id,
      municipios,
      school_names,
      school_ids,
    )

    if (resolvedSchoolIds.length > 0) {
      const { data: schoolsData, error: schoolError } = await supabaseAdmin
        .from('schools')
        .select('id, name, municipio, state_uf')
        .in('id', resolvedSchoolIds)

      if (schoolError || !schoolsData || schoolsData.length !== resolvedSchoolIds.length) {
        return new Response(
          JSON.stringify({ error: 'Uma ou mais escolas não foram encontradas' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      resolvedSchoolNames = schoolsData.map((s) => s.name)
      resolvedMunicipios = [
        ...new Set(schoolsData.map((s) => `${s.municipio} - ${s.state_uf}`)),
      ]
      resolvedSchoolIds = schoolsData.map((s) => s.id)
    } else if (role === 'professor' || role === 'admin') {
      return new Response(
        JSON.stringify({ error: 'Selecione ao menos uma escola' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const resolvedTurmas = Array.isArray(turmas) ? uniqueStrings(turmas) : []

    const authUpdate: { email?: string; password?: string; user_metadata: { full_name: string; role: string } } = {
      user_metadata: { full_name, role },
    }

    if (email?.trim() && email.trim().toLowerCase() !== targetProfile.email?.toLowerCase()) {
      authUpdate.email = email.trim()
    }

    if (password?.trim()) {
      if (password.trim().length < 6) {
        return new Response(
          JSON.stringify({ error: 'A senha deve ter pelo menos 6 caracteres' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      authUpdate.password = password.trim()
    }

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user_id, authUpdate)
    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const profileUpdate: Record<string, unknown> = {
      full_name,
      role,
      email: authUpdate.email || targetProfile.email,
      municipio: resolvedMunicipios[0] || null,
      school_name: resolvedSchoolNames[0] || null,
      school_id: resolvedSchoolIds[0] || null,
      municipios: resolvedMunicipios,
      school_names: resolvedSchoolNames,
      school_ids: resolvedSchoolIds,
      turmas: role === 'professor' ? resolvedTurmas : [],
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdate)
      .eq('id', user_id)

    if (profileError) {
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({
        user: {
          id: user_id,
          email: profileUpdate.email,
          full_name,
          role,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
