import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password, full_name, role, municipio, school_name, school_id, turmas } = await req.json()

    if (!email || !password || !full_name || !role) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: email, password, full_name, role' }),
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

    if (!callerProfile || !['root', 'admin'].includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Apenas admin/root podem cadastrar usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (role === 'root' && callerProfile.role !== 'root') {
      return new Response(
        JSON.stringify({ error: 'Apenas root pode criar usuários root' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    })

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let resolvedMunicipio = municipio?.trim() || null
    let resolvedSchoolName = school_name?.trim() || null
    let resolvedSchoolId = school_id || null

    if (school_id) {
      const { data: school, error: schoolError } = await supabaseAdmin
        .from('schools')
        .select('id, name, municipio, state_uf')
        .eq('id', school_id)
        .single()

      if (schoolError || !school) {
        return new Response(
          JSON.stringify({ error: 'Escola não encontrada' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      resolvedMunicipio = `${school.municipio} - ${school.state_uf}`
      resolvedSchoolName = school.name
      resolvedSchoolId = school.id
    }

    const resolvedTurmas = Array.isArray(turmas)
      ? [...new Set(turmas.map((t: unknown) => String(t).trim()).filter(Boolean))]
      : []

    await supabaseAdmin
      .from('profiles')
      .update({
        full_name,
        role,
        municipio: resolvedMunicipio,
        school_name: resolvedSchoolName,
        school_id: resolvedSchoolId,
        turmas: role === 'professor' ? resolvedTurmas : [],
      })
      .eq('id', newUser.user.id)

    return new Response(
      JSON.stringify({ user: { id: newUser.user.id, email, full_name, role } }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
